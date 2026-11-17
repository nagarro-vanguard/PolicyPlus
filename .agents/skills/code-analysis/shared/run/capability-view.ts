import { Effect, Stream } from "effect";
import { titleOf } from "../model/code-names";
import { compareText, getOrCreate } from "./collections";
import { CodeGraph } from "../graph/code-graph";
import { entityUsesOf, readEntityIndex } from "../read/entity-index";
import { RecordReads } from "../read/record-reads";
import { StageRecords } from "../store/stage-records";
import { readHoldings, type EntryPointFacts } from "../graph/entry-points";
import type { Capability } from "../model/schemas/capability";
import type { Lines } from "../model/shared-fields";
import type { Entity } from "../model/schemas/entity";
import { ExternalSystem } from "../model/schemas/external-system";
import { CapabilityGroup } from "../model/schemas/briefing";
import { readRulesView, saversOf } from "../read/rules-view";
import { readSecondReadings } from "../jobs/second-readings";
import { analysisPaths, briefingKey } from "./analysis-layout";
import { FileAccess } from "../source/file-access";
import { readDocumentStrictly } from "./json-files";
import { isRefused } from "../jobs/job-outcome";
import { StageJob, StageJobList } from "../model/schemas/capabilities-and-entities-jobs";
import { partOf } from "../source/scope-counts";
import { SystemPart } from "../model/schemas/system-part";
import { resourceIdOf } from "../model/resource-ids";

type EntryPointView = {
    readonly id: string;
    readonly title: string;
    readonly purpose: string;
    readonly reachedBy: string;
    readonly startedBy: EntryPointFacts["entryPoint"]["startedBy"];
    readonly lines: Lines;
    readonly part: { readonly id: string; readonly name: string } | undefined;
};

type CapabilityView = {
    readonly capability: Capability;
    readonly entryPoints: readonly EntryPointView[];
    readonly startedBy: { readonly person: number; readonly schedule: number; readonly otherSystem: number };
    readonly entities: ReadonlyArray<{ readonly entity: Entity; readonly kinds: readonly string[] }>;
    readonly talksTo: readonly string[];
    readonly continuesInto: readonly string[];
};

export type EntityView = {
    readonly entity: Entity;
    readonly keptIn: ReadonlyArray<{ readonly system: string; readonly resources: readonly string[] }>;
    readonly shapes: number;
    readonly usedBy: ReadonlyArray<{ readonly capability: Capability; readonly kinds: readonly string[] }>;
};

/**
 * One entry point as the pages show it: its title, purpose, how it is reached, who starts it, and the
 * part its code is in.
 * @param entryPoint the entry point
 * @param partHolding the part holding a path
 * @returns the view
 */
const entryPointView = (
    entryPoint: EntryPointFacts,
    partHolding: (path: string) => { readonly id: string; readonly name: string } | undefined,
): EntryPointView => ({
    id: entryPoint.block.id,
    title: titleOf(entryPoint.block),
    purpose: entryPoint.entryPoint.purpose,
    reachedBy: entryPoint.entryPoint.reachedBy,
    startedBy: entryPoint.entryPoint.startedBy,
    lines: entryPoint.block.lines,
    part: partHolding(entryPoint.block.lines.file),
});

/**
 * Each kind of data a capability's flows use, with how, and the external systems they reach (5.6, P10, D225): read
 * through the reach of each capability's entry points and the entity index, so what is held grows with the capabilities and
 * the kinds of data. The one producer of both, for the pages and the briefing alike.
 * @param held each capability with its entry points
 * @returns the uses and the external systems reached, by capability id
 */
const usesOfCapabilities = Effect.fnUntraced(function* (
    held: ReadonlyArray<readonly [Capability, readonly EntryPointFacts[]]>,
) {
    const index = yield* readEntityIndex();
    const groups = held.map(([capability, own]) => ({
        key: capability.id,
        entryPoints: own.map((entryPoint) => entryPoint.block.id),
    }));
    const { uses, systemsOf } = yield* (yield* CodeGraph).holdGroups(groups, (reach) =>
        Effect.gen(function* () {
            const systems = new Map<string, readonly string[]>();
            for (const group of groups) {
                systems.set(group.key, yield* reach.externalSystemsOfGroup(group.key));
            }
            return { uses: yield* reach.countResourceUses, systemsOf: systems };
        }),
    );
    const byCapability = new Map<string, Map<string, { entity: Entity; kinds: Set<string> }>>();
    for (const use of entityUsesOf(index, uses)) {
        const own = byCapability.get(use.key);
        const entities = own === undefined ? new Map<string, { entity: Entity; kinds: Set<string> }>() : own;
        byCapability.set(use.key, entities);
        const known = entities.get(use.entity.id);
        entities.set(use.entity.id, {
            entity: use.entity,
            kinds: new Set([...(known === undefined ? [] : known.kinds), use.kind]),
        });
    }
    return { index, byCapability, systemsOf };
});

/**
 * Each kind of data as its page shows it: the external systems it is kept in, counted, its data shapes, and the
 * capabilities that use it, with how.
 * @param index the entity index
 * @param capabilities every capability as the pages show it
 * @param systems each external system's name, by its record id
 * @returns the kinds of data, in the index's order
 */
const entityViewsOf = (
    index: Effect.Success<ReturnType<typeof readEntityIndex>>,
    capabilities: readonly CapabilityView[],
    systems: ReadonlyMap<string, string>,
): EntityView[] =>
    index.entities.map((entity) => {
        const kept = new Map<string, string[]>();
        for (const resource of index.resourcesOf(entity)) {
            const name = systems.get(resource.externalSystem);
            const label = name === undefined ? resource.externalSystem : name;
            getOrCreate(kept, label).push(resource.resource);
        }
        return {
            entity,
            keptIn: [...kept].map(([system, resources]) => ({ system, resources })),
            shapes: index.shapesOf(entity).length,
            usedBy: capabilities.flatMap((view) => {
                const use = view.entities.find((each) => each.entity.id === entity.id);
                return use === undefined ? [] : [{ capability: view.capability, kinds: use.kinds }];
            }),
        };
    });

/**
 * What Capabilities and entities and Publish leave unplaced, for the system page (D229, D225, D226), derived from the
 * store and the stages' job files, with no meaning given to any count: the saved resources no kind of data keeps, by
 * name, so the person can check each was rightly answered as holding nothing; the written entries a refused merge job
 * left not compared; and whether the briefing was refused, leaving the capabilities in one list.
 * @param root the analysis root
 * @param index the entity index
 * @returns the saved resources no kind of data keeps, by name, the entries not compared, and whether the
 * briefing was refused
 */
const unplacedOf = Effect.fnUntraced(function* (
    root: string,
    index: Effect.Success<ReturnType<typeof readEntityIndex>>,
) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root);
    const unkept = new Map<string, string>();
    for (const use of yield* (yield* CodeGraph).countResourceUsesByLayer) {
        if (use.kind === "saves" && index.entityOf(use.externalSystem, use.resource) === undefined) {
            unkept.set(resourceIdOf(use.externalSystem, use.resource), use.resource);
        }
    }
    let notCompared = 0;
    if (yield* fs.exists(paths.capabilitiesAndEntities.jobs)) {
        for (const entry of yield* readDocumentStrictly(paths.capabilitiesAndEntities.jobs, StageJobList)) {
            if (entry.kind === "mergeCapabilities" || entry.kind === "mergeEntities") {
                if (yield* isRefused("capabilities-and-entities", entry.jobId)) {
                    const job = yield* readDocumentStrictly(
                        paths.capabilitiesAndEntities.jobFile(entry.jobId),
                        StageJob,
                    );
                    notCompared += "entries" in job ? job.entries.length : 0;
                }
            }
        }
    }
    return {
        unkeptSaved: [...unkept.values()].sort(compareText),
        notCompared,
        briefingRefused: yield* isRefused("publish", briefingKey),
    };
});

/**
 * Where each capability's work continues into code with no source here (P12.4): the operations its entry points'
 * reach calls at a library, each once, named with the library, in the order the store gives them. What that code
 * changes is not shown, so a page says so rather than counting only what the analysed code reads.
 * @param held each capability with its entry points
 * @param systems every external system
 * @returns the operations of a capability, by its record id
 */
const untracedOperationsOf = Effect.fnUntraced(function* (
    held: ReadonlyArray<readonly [Capability, ReadonlyArray<{ readonly block: { readonly id: string } }>]>,
    systems: ReadonlyArray<typeof ExternalSystem.Type>,
) {
    const libraries = new Map(
        systems
            .filter((system) => system.kind === "library")
            .map((system): [string, string] => [system.id, system.name]),
    );
    const holder = new Map<string, string>();
    held.forEach(([capability, own]) => own.forEach((entryPoint) => holder.set(entryPoint.block.id, capability.id)));
    const operations = new Map<string, string[]>();
    for (const use of yield* (yield* CodeGraph).findResourcesReachedFromEach([...holder.keys()])) {
        const library = libraries.get(use.externalSystem);
        const capability = holder.get(use.entryPoint);
        if (library !== undefined && capability !== undefined) {
            const named = `${use.resource} in ${library}`;
            const list = getOrCreate(operations, capability);
            if (!list.includes(named)) {
                list.push(named);
            }
        }
    }
    return (capability: string): readonly string[] => {
        const found = operations.get(capability);
        return found === undefined ? [] : found;
    };
});

/**
 * What the capability and kind-of-data pages show (section 7, 5.6), from Capabilities and entities' accepted records
 * and the Map's: each capability with its entry points and the kinds of data its flows save and read; each kind of data with
 * the external systems it is kept in, its data shapes, and the capabilities that use it; and, once Capability rules is
 * accepted, the studied capabilities' rules and the kinds of data's lives (`readRulesView`); once Publish is, the areas
 * the capabilities fall into. None before Capabilities
 * and entities is accepted.
 * @param root the analysis root
 * @returns the capabilities, the kinds of data, and the entry points no capability holds; or undefined
 */
export const readCapabilityView = Effect.fnUntraced(function* (root: string) {
    if (!(yield* (yield* StageRecords).stageHasAcceptedRecords("capabilities-and-entities"))) {
        return undefined;
    }
    const holdings = yield* readHoldings();
    const partHolding = partOf(yield* Stream.runCollect((yield* RecordReads).recordsOfType("SystemPart", SystemPart)));
    const { index, byCapability, systemsOf } = yield* usesOfCapabilities(holdings.held);
    const systemRecords = yield* Stream.runCollect(
        (yield* RecordReads).recordsOfType("ExternalSystem", ExternalSystem),
    );
    const systems = new Map(systemRecords.map((system): [string, string] => [system.id, system.name]));
    const continuesInto = yield* untracedOperationsOf(holdings.held, systemRecords);
    const usesOf = (capability: Capability) => {
        const found = byCapability.get(capability.id);
        return found === undefined
            ? []
            : [...found.values()].map((each) => ({ entity: each.entity, kinds: [...each.kinds] }));
    };
    const capabilities: CapabilityView[] = holdings.held.map(([capability, own]) => {
        const reached = systemsOf.get(capability.id);
        return {
            capability,
            entryPoints: own.map((entryPoint) => entryPointView(entryPoint, partHolding)),
            startedBy: {
                person: own.filter((entryPoint) => entryPoint.entryPoint.startedBy === "person").length,
                schedule: own.filter((entryPoint) => entryPoint.entryPoint.startedBy === "schedule").length,
                otherSystem: own.filter((entryPoint) => entryPoint.entryPoint.startedBy === "otherSystem").length,
            },
            entities: usesOf(capability),
            talksTo: (reached === undefined ? [] : reached).flatMap((id) => {
                const name = systems.get(id);
                return name === undefined ? [] : [name];
            }),
            continuesInto: continuesInto(capability.id),
        };
    });
    const entities = entityViewsOf(index, capabilities, systems);
    const rules = yield* readRulesView(
        root,
        new Map(capabilities.map((view) => [view.capability.id, view.entryPoints.map((entryPoint) => entryPoint.id)])),
        index.entities,
        saversOf(capabilities),
    );
    const areas = yield* Stream.runCollect(
        (yield* RecordReads).recordsOfType("CapabilityGroup", CapabilityGroup, ["publish"]),
    );
    const areaReadings = yield* readSecondReadings(root, "CapabilityGroup");
    return {
        capabilities,
        entities,
        unheld: holdings.unheld.map((entryPoint) => entryPointView(entryPoint, partHolding)),
        rules,
        areas: areas.map((area) => {
            const reading = areaReadings.get(area.id);
            return { ...area, reading: reading === undefined ? ("unread" as const) : reading.label };
        }),
        unplaced: yield* unplacedOf(root, index),
    };
});
