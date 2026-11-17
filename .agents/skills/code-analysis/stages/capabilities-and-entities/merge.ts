import { Effect, Schema } from "effect";
import { MergeCandidate } from "../../shared/model/schemas/capabilities-and-entities-jobs";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { getOrCreate, known } from "../../shared/run/collections";
import { FileAccess } from "../../shared/source/file-access";
import { mergesOf, resolveMerges } from "../../shared/jobs/merging";
import { jobIdIssuer } from "../../shared/jobs/job-ids";
import { AnyRecord, jsonlText, readOptionalRecords } from "../../shared/run/json-files";
import { ofType } from "../../shared/read/record-reading";
import { JobIdPrefix } from "../../shared/model/record-ids";
import { ResourceAssignment, ShapeAssignment, EntryPointAssignment } from "../../shared/model/schemas/assignment";
import type { Capability } from "../../shared/model/schemas/capability";
import type { Entity } from "../../shared/model/schemas/entity";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import {
    definitionOf,
    freshJob,
    isMerging,
    jobFiles,
    jobNamed,
    mergeKind,
    writeJob,
    type ListEntry,
    type Units,
} from "./jobs";
import { entriesAmong, entryRecord, outcomeOf, readWrittenEntries } from "./registry";
import { readPartOf } from "./units";

type Entry = Capability | Entity;

const shown = 12;

const decodeLine = Schema.decodeUnknownSync(MergeCandidate);

/**
 * Each entry's members as the merge reads them: the purposes of the entry points assigned to each capability, and the
 * resources and data shapes assigned to each entity, in the order assigned, from every assigning job's output, read
 * one job at a time, keeping the first `shown` (twelve) of each entry and counting every one (D215, D241): a merge
 * judges two entries by their members, and three hid what an entry holds.
 * @param root the analysis root
 * @param jobs every listed job
 * @returns each entry's first members and how many it has, by record id
 */
const membersOf = Effect.fnUntraced(function* (root: string, jobs: readonly ListEntry[]) {
    const members = new Map<string, Set<string>>();
    const add = (entry: string | undefined, member: string) => {
        if (entry !== undefined) {
            const own = members.get(entry);
            if (own === undefined) {
                members.set(entry, new Set([member]));
            } else {
                own.add(member);
            }
        }
    };
    for (const entry of jobs.filter((job) => !isMerging(job.kind))) {
        const job = yield* jobNamed(root, entry.jobId);
        const records = (yield* readOptionalRecords(jobFiles(root, job.jobId, job.kind).outputPath, AnyRecord)).flatMap(
            (record) => (typeof record.id === "string" ? [{ ...record, id: record.id }] : []),
        );
        if (job.kind === "assignEntryPoints") {
            const purposeOf = new Map(job.entryPoints.map((unit) => [unit.id, unit.purpose] as const));
            for (const assignment of ofType(records, RecordIdPrefix.EntryPointAssignment, EntryPointAssignment)) {
                const purpose = purposeOf.get(assignment.entryPoint);
                add(assignment.capability, purpose === undefined ? assignment.entryPoint : purpose);
            }
        } else if (job.kind === "assignResources") {
            const spellingOf = new Map(job.resources.map((unit) => [unit.id, unit.resource] as const));
            for (const assignment of ofType(records, RecordIdPrefix.ResourceAssignment, ResourceAssignment)) {
                const spelling = spellingOf.get(assignment.resource);
                add(assignment.entity, spelling === undefined ? assignment.resource : spelling);
            }
        } else if (job.kind === "assignShapes") {
            const nameOf = new Map(job.shapes.map((unit) => [unit.definition, unit.writtenAs] as const));
            for (const assignment of ofType(records, RecordIdPrefix.ShapeAssignment, ShapeAssignment)) {
                const name = nameOf.get(assignment.definition);
                add(assignment.entity, name === undefined ? assignment.definition : name);
            }
        }
    }
    return members;
});

/**
 * Written entries cut into slices of one budget, in their order: each slice the units of one merge job.
 * @param entries the written entries, in order
 * @param budget the most characters one slice holds
 * @param unitsOf a slice's job units
 * @returns the slices' units, in order
 */
function slicesOf<E extends Entry>(
    entries: readonly E[],
    budget: number,
    unitsOf: (first: E, rest: readonly E[]) => Units,
): Units[] {
    const slices: Units[] = [];
    let slice: E[] = [];
    let size = 0;
    const close = () => {
        const [first, ...rest] = slice;
        if (first !== undefined) {
            slices.push(unitsOf(first, rest));
        }
        slice = [];
        size = 0;
    };
    for (const entry of entries) {
        const length = String(entry).length;
        if (slice.length && size + length > budget) {
            close();
        }
        slice.push(entry);
        size += length;
    }
    close();
    return slices;
}

/**
 * The whole registry of one kind as the merge's jobs search it (D215): one line per entry, seeded or written, with its
 * name, purpose, the parts its evidence lies in, its first twelve members and how many more it has.
 * @param seeded the seeded entries
 * @param written the written entries
 * @param members each entry's members, by record id
 * @param partHolding the part holding a path
 * @returns the lines, as records
 */
const linesToMerge = (
    seeded: readonly Entry[],
    written: readonly Entry[],
    members: ReadonlyMap<string, ReadonlySet<string>>,
    partHolding: (path: string) => { readonly name: string } | undefined,
) => {
    const line = (entry: Entry, isWritten: boolean) => {
        const own = membersNamed(members, entry.id);
        return {
            id: entry.id,
            name: entry.name,
            purpose: entry.purpose,
            parts: [
                ...new Set(
                    entry.evidence.flatMap((lines) => {
                        const part = partHolding(lines.file);
                        return part === undefined ? [] : [part.name];
                    }),
                ),
            ],
            members: own.slice(0, shown),
            moreMembers: Math.max(0, own.length - shown),
            written: isWritten,
        };
    };
    return [...seeded.map((entry) => line(entry, false)), ...written.map((entry) => line(entry, true))];
};

/**
 * An entry's members, in the order assigned; none when no unit was assigned to it.
 * @param members each entry's members, by record id
 * @param id the entry's record id
 * @returns its members
 */
const membersNamed = (members: ReadonlyMap<string, ReadonlySet<string>>, id: string) => {
    const own = members.get(id);
    return own === undefined ? [] : [...own];
};

/**
 * Begin the merge once every assigning job is decided (D215, P1.38): for each registry whose assigning jobs wrote
 * entries, write the whole registry as the merge's jobs search it (`linesToMerge`), then cut its written entries into
 * slices of one budget (`slicesOf`), in the order written, never ordered by what their words say, each slice a merge job added to the list and reviewed. The
 * entries are never withdrawn: a slice only merges.
 * @param root the analysis root
 * @param jobs every listed job
 * @returns the jobs listed now, and how many merge jobs were added
 */
export const beginMerge = Effect.fnUntraced(function* (root: string, jobs: readonly ListEntry[]) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root).capabilitiesAndEntities;
    const budget = (yield* AnalysisConfig).capabilitiesAndEntitiesJobCharacters;
    const written = yield* readWrittenEntries(root);
    const members = yield* membersOf(root, jobs);
    const partHolding = yield* readPartOf();
    const issuer = yield* jobIdIssuer(JobIdPrefix.capabilitiesAndEntities, []);
    const slices: Units[] = [];
    if (written.capabilities.length) {
        yield* fs.writeText(
            paths.toMerge("capabilities"),
            jsonlText(linesToMerge([], written.capabilities, members, partHolding).map((line) => decodeLine(line))),
        );
        slices.push(
            ...slicesOf(written.capabilities, budget, (first, rest) => ({
                kind: "mergeCapabilities",
                entries: [first, ...rest],
            })),
        );
    }
    if (written.entities.length) {
        yield* fs.writeText(
            paths.toMerge("entities"),
            jsonlText(linesToMerge([], written.entities, members, partHolding).map((line) => decodeLine(line))),
        );
        slices.push(
            ...slicesOf(written.entities, budget, (first, rest) => ({
                kind: "mergeEntities",
                entries: [first, ...rest],
            })),
        );
    }
    const added: ListEntry[] = [];
    for (const units of slices) {
        const definition = definitionOf(units);
        const { id } = yield* issuer.idOf(definition);
        yield* writeJob(root, freshJob(id, units));
        added.push({ jobId: id, kind: units.kind, definition });
    }
    const listed = [...jobs, ...added];
    yield* fs.writeText(paths.jobs, JSON.stringify(listed, null, 1));
    return { listed, added: added.length };
});

/**
 * The registries as the merge leaves them (D215): every entry seeded or written, never dropped, each with the words its
 * slice's merge job last gave it, and the merges of every merge job joined across them and resolved (`resolveMerges`):
 * a seeded entry stands before a written one, then the earlier written. A refused merge job's slice is left as written
 * and counted as not compared.
 * @param root the analysis root
 * @param jobs every listed job
 * @returns the entries standing, each with every entry it stands for in `mergedFrom`; the merges; the rings broken;
 * and the entries no merge job compared
 */
export const mergedRegistries = Effect.fnUntraced(function* (root: string, jobs: readonly ListEntry[]) {
    const written = yield* readWrittenEntries(root);
    const standing: Entry[] = [];
    const resolved = new Map<string, string>();
    const rings: string[][] = [];
    const notCompared: string[] = [];
    for (const kind of ["capabilities", "entities"] as const) {
        const own: readonly Entry[] = kind === "capabilities" ? written.capabilities : written.entities;
        const byId = new Map<string, Entry>(own.map((entry) => [entry.id, entry] as const));
        const order = new Map<string, number>(own.map((entry, i) => [entry.id, i] as const));
        const merges: Array<readonly [string, string]> = [];
        for (const listed of jobs.filter((job) => job.kind === mergeKind[kind])) {
            const outcome = yield* outcomeOf(listed);
            const job = yield* jobNamed(root, listed.jobId);
            if (outcome !== "accepted") {
                notCompared.push(
                    ...(isMerging(job.kind) && "entries" in job ? job.entries.map((entry) => entry.id) : []),
                );
                continue;
            }
            const out = entriesAmong(
                yield* readOptionalRecords(jobFiles(root, listed.jobId, listed.kind).outputPath, AnyRecord),
            );
            const slice = new Set<string>("entries" in job ? job.entries.map((entry) => entry.id) : []);
            for (const entry of kind === "capabilities" ? out.capabilities : out.entities) {
                if (slice.has(entry.id)) {
                    byId.set(entry.id, entry);
                }
                merges.push(...mergesOf([entry]));
            }
        }
        const prefer = (left: string, right: string) =>
            known(order, left, "a merge names an entry of the registry") -
            known(order, right, "a merge names an entry of the registry");
        const result = resolveMerges(merges, prefer);
        result.resolved.forEach((to, from) => resolved.set(from, to));
        rings.push(...result.rings);
        const standsFor = new Map<string, string[]>();
        result.resolved.forEach((to, from) => getOrCreate(standsFor, to).push(from));
        for (const entry of byId.values()) {
            if (!result.resolved.has(entry.id)) {
                const merged = standsFor.get(entry.id);
                const record = entryRecord(entry);
                standing.push(
                    entriesAmongOne(
                        merged === undefined ? withoutMerges(record) : { ...record, mergedFrom: [...merged].sort() },
                    ),
                );
            }
        }
    }
    return { standing, resolved, rings, notCompared };
});

/**
 * An entry's record without the merges a merge job wrote on it: what stands is decided across every slice, never one.
 * @param record the entry, as JSON
 * @returns the record, with no `mergedFrom`
 */
const withoutMerges = (record: Record<string, unknown>) => {
    const { mergedFrom: _merges, ...rest } = record;
    return rest;
};

/**
 * One entry, decoded by its type.
 * @param record the entry, as JSON
 * @returns the capability or entity
 */
const entriesAmongOne = (record: Record<string, unknown>): Entry => {
    const entries = entriesAmong([record]);
    return known(
        new Map([...entries.capabilities, ...entries.entities].map((entry) => [entry.id, entry] as const)),
        String(record.id),
        "a registry holds only capabilities and entities",
    );
};
