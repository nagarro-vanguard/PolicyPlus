import { Effect } from "effect";
import type { JsonRecord } from "../../shared/model/json-record";
import { ScopeFiles } from "../../shared/read/scope-files";
import { ofType } from "../../shared/read/record-reading";
import { citedFiles, scopeGaps } from "../../shared/read/record-writing";
import { ResourceAssignment, ShapeAssignment, EntryPointAssignment } from "../../shared/model/schemas/assignment";
import { Capability } from "../../shared/model/schemas/capability";
import { Fact } from "../../shared/model/schemas/fact";
import { readFactBase, stageFactGaps } from "../../shared/read/stage-facts";
import { Entity } from "../../shared/model/schemas/entity";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { registryOf as registryKindOf, type Kind, type Listed, type RegistryKind } from "./jobs";
import { entriesAmong, entryRecord, readRegistry, readWrittenEntries } from "./registry";

export type RegistryRead = {
    readonly entries: ReadonlyMap<string, Capability | Entity>;
    readonly written: ReadonlySet<string>;
};

/**
 * A registry as its jobs read it, by record id, with the record ids of the entries assigning jobs wrote: what an
 * assigning job's citations resolve against, and what a merge job merges.
 * @param root the analysis root
 * @param kind the registry
 * @returns the registry
 */
export const readRegistryRead = Effect.fnUntraced(function* (root: string, kind: RegistryKind) {
    const written = yield* readWrittenEntries(root);
    const read: RegistryRead = {
        entries: new Map((yield* readRegistry(root, kind)).map((entry) => [entry.id, entry] as const)),
        written: new Set<string>(
            (kind === "capabilities" ? written.capabilities : written.entities).map((entry) => entry.id),
        ),
    };
    return read;
});

/**
 * The entries among a job's records.
 * @param records the job's records
 * @returns its capabilities and entities
 */
const entriesOf = (records: readonly Finding[]) => {
    const entries = entriesAmong(records);
    return [...entries.capabilities, ...entries.entities];
};
import { missedOutside } from "../../shared/jobs/review-verdicts";
import type { Missed } from "../../shared/model/schemas/missed";

type Finding = JsonRecord & { readonly id: string };

type Assigned = { readonly id: string; readonly key: string };

export const shapesOf = {
    assignEntryPoints: { EntryPointAssignment, Capability, Fact },
    assignResources: { ResourceAssignment, Entity, Fact },
    assignShapes: { ShapeAssignment, Entity, Fact },
    mergeCapabilities: { Capability, Fact },
    mergeEntities: { Entity, Fact },
} as const satisfies Record<Kind, object>;

/**
 * The gate on an assigning job's records (D215): every unit of the job has an assignment, and none names a unit outside
 * the job (an assignment's identity is its unit, so a unit's newest assignment is its one). That a cited entry exists is
 * the shared rule over cited ids: the registry written beside the job, or an entry the job wrote itself.
 * @param assignments the job's assignments, each by its unit's key
 * @param units the job's units: each key with the label its gaps name it by
 * @returns one line per gap
 */
function assignmentGaps(assignments: readonly Assigned[], units: ReadonlyMap<string, string>): string[] {
    const assigned = new Set(assignments.map((assignment) => assignment.key));
    return [
        ...assignments
            .filter((assignment) => !units.has(assignment.key))
            .map((assignment) => `${assignment.id} assigns a unit that is no unit of this job`),
        ...[...units]
            .filter(([key]) => !assigned.has(key))
            .map(
                ([, label]) =>
                    `${label} has no assignment: give it the entry of the registry it meets, or write the entry it needs`,
            ),
    ];
}

/**
 * The gate on a merge job's records (D215, P1.35): it changes the words only of the entries of its own slice, so two
 * slices never write one entry two ways; any other entry it writes is the registry's own, word for word, with only the
 * entries it merges added; and it merges only entries an assigning job wrote, each once, never one it keeps, never one
 * into itself. A check stable once the job has run: its slice and the registry it searched are fixed by then (D208).
 * @param written the job's entries, as records
 * @param slice the record ids of its slice
 * @param registry every entry of the registry, by record id, as the job searched it
 * @param foldable the record ids of the entries assigning jobs wrote
 * @returns one line per gap
 */
function mergeGaps(
    written: ReadonlyArray<Capability | Entity>,
    slice: ReadonlySet<string>,
    registry: ReadonlyMap<string, Capability | Entity>,
    foldable: ReadonlySet<string>,
): string[] {
    const wordsOf = (entry: Capability | Entity) => {
        const { mergedFrom: _merges, ...words } = entryRecord(entry);
        return JSON.stringify(words);
    };
    const kept = new Set(written.map((entry) => entry.id));
    const merged = new Map<string, string>();
    const gaps: string[] = [];
    for (const entry of written) {
        const was = registry.get(entry.id);
        if (!slice.has(entry.id) && (was === undefined || wordsOf(was) !== wordsOf(entry))) {
            gaps.push(
                was === undefined
                    ? `${entry.id} is no entry of the registry: write only entries of your slice, or merge into one the registry holds`
                    : `${entry.id} is not in your slice, so its words are another job's: write it as the registry has it, adding only the entries it merges`,
            );
        }
        for (const id of entry.mergedFrom === undefined ? [] : entry.mergedFrom) {
            const earlier = merged.get(id);
            merged.set(id, entry.id);
            if (id === entry.id) {
                gaps.push(`${entry.id} merges itself`);
            } else if (!foldable.has(id)) {
                gaps.push(`${entry.id} merges ${id}, which no assigning job wrote: only a written entry is merged`);
            } else if (kept.has(id)) {
                gaps.push(`${entry.id} merges ${id}, which this job also keeps: merge it, or keep it, not both`);
            } else if (earlier !== undefined) {
                gaps.push(`${id} is merged into both ${earlier} and ${entry.id}: merge it once`);
            }
        }
    }
    return gaps;
}

/**
 * An assigning job's units, by the key their assignments name, each with the label its gaps name it by.
 * @param job the job
 * @returns the units
 */
const unitsOfJob = (job: Listed): ReadonlyMap<string, string> =>
    new Map<string, string>(
        job.kind === "assignEntryPoints"
            ? job.entryPoints.map((unit) => [unit.id, unit.reachedBy] as const)
            : job.kind === "assignResources"
              ? job.resources.map((unit) => [unit.id, `${unit.resource} at ${unit.externalSystem}`] as const)
              : job.kind === "assignShapes"
                ? job.shapes.map((unit) => [unit.definition, unit.writtenAs] as const)
                : [],
    );

/**
 * An assigning job's assignments, each keyed by its unit.
 * @param records the job's records
 * @param kind the job's kind
 * @returns the assignments
 */
function assignmentsOf(records: readonly Finding[], kind: Kind): Assigned[] {
    return kind === "assignEntryPoints"
        ? ofType(records, RecordIdPrefix.EntryPointAssignment, EntryPointAssignment).map((each) => ({
              id: each.id,
              key: each.entryPoint,
          }))
        : kind === "assignResources"
          ? ofType(records, RecordIdPrefix.ResourceAssignment, ResourceAssignment).map((each) => ({
                id: each.id,
                key: each.resource,
            }))
          : ofType(records, RecordIdPrefix.ShapeAssignment, ShapeAssignment).map((each) => ({
                id: each.id,
                key: each.definition,
            }));
}

/**
 * The stage under review for one job: the records its kind writes, and its gate. Every entry and assignment cites
 * lines in scope, and every job's facts are held to the later stages' fact rules (`stageFactGaps`); an assigning job is
 * held to `assignmentGaps` and a merge job to `mergeGaps`, each with its registry written beside it, so its citations
 * of entries resolve while the stage's accepted records are cleared.
 * @param job the job
 * @param registryOf a registry as its jobs read it, and the entries assigning jobs wrote: read once per `finish`, once
 *  per `check`
 * @returns the stage as the review rounds take it
 */
export const stageReview = <E, R>(
    job: Listed,
    registryOf: (kind: RegistryKind) => Effect.Effect<RegistryRead, E, R>,
) => ({
    stage: "capabilities-and-entities" as const,
    shapes: shapesOf[job.kind],
    checksFor: (cited: readonly JsonRecord[]) =>
        Effect.gen(function* () {
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            const facts = {
                ...(yield* readFactBase()),
                lineCounts,
            };
            const scope = (records: readonly Finding[]) => [
                ...scopeGaps(records, lineCounts, "manifest", (record) => record.id),
                ...stageFactGaps(records, facts),
            ];
            const checks = (gate: (records: readonly Finding[]) => string[], beside: ReadonlySet<string>) => ({
                records: gate,
                placement: (missed: ReadonlyArray<typeof Missed.Type>) => missedOutside(missed, lineCounts, "manifest"),
                writtenBeside: beside,
            });
            const registry = yield* registryOf(registryKindOf[job.kind]);
            const ids = new Set(registry.entries.keys());
            if (job.kind === "mergeCapabilities" || job.kind === "mergeEntities") {
                const slice = new Set<string>(job.entries.map((entry) => entry.id));
                return checks(
                    (records) => [
                        ...scope(records),
                        ...mergeGaps(entriesOf(records), slice, registry.entries, registry.written),
                    ],
                    ids,
                );
            }
            const units = unitsOfJob(job);
            return checks(
                (records) => [...scope(records), ...assignmentGaps(assignmentsOf(records, job.kind), units)],
                ids,
            );
        }),
});
