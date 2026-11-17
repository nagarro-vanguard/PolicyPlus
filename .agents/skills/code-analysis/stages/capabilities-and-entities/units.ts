import { Effect, Schema, Stream } from "effect";
import { lineSpan } from "../../shared/model/line-ranges";
import { compareText, getOrCreate, known } from "../../shared/run/collections";
import { resourceIdOf } from "../../shared/model/resource-ids";
import { partOf } from "../../shared/source/scope-counts";
import { SystemPart } from "../../shared/model/schemas/system-part";
import type { EntryPointResourceRow } from "../../shared/store/rows";
import { readCodeKinds, type CodeKinds } from "../../shared/read/code-kinds";
import { CodeGraph } from "../../shared/graph/code-graph";
import { readShapesDeclaredAt, resourceUsesOf } from "../../shared/read/entity-index";
import { recordsPerPage } from "../../shared/store/stored-bodies";
import { RecordReads } from "../../shared/read/record-reads";
import { readEntryPoints } from "../../shared/graph/entry-points";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { DataDefinition } from "../../shared/model/schemas/map";
import { ResourceUnit, ShapeUnit, EntryPointUnit } from "../../shared/model/schemas/capabilities-and-entities-jobs";
import { UsageInvalid } from "../../shared/run/script-errors";
import { addNeighbours } from "./neighbours";

type EntryPointFacts = typeof EntryPointUnit.Type;

/**
 * Location order: by file, then line, then record id, so ties are never broken by the order records were written.
 * @param left one place
 * @param left.file its file
 * @param left.firstLine its first line
 * @param left.id its record id
 * @param right the other place
 * @param right.file its file
 * @param right.firstLine its first line
 * @param right.id its record id
 * @returns the order of the two
 */
const byLocation = (
    left: { readonly file: string; readonly firstLine: number; readonly id: string },
    right: { readonly file: string; readonly firstLine: number; readonly id: string },
) => compareText(left.file, right.file) || left.firstLine - right.firstLine || compareText(left.id, right.id);

/**
 * The part holding each file, as the cut reads it: by the folders Inventory gave each part.
 * @returns the part holding a path, or none
 */
export const readPartOf = Effect.fnUntraced(function* () {
    return partOf(yield* Stream.runCollect((yield* RecordReads).recordsOfType("SystemPart", SystemPart)));
});

/**
 * The entry points each entry point's chain requests and those requesting it, each with what it does (D218).
 * @param entryPoints every entry point
 * @returns the two lists, by entry point
 */
const requestsOf = Effect.fnUntraced(function* (entryPoints: readonly EntryPointRecord[]) {
    const purposeOf = new Map(
        entryPoints.map((entryPoint) => [entryPoint.block.id, entryPoint.entryPoint.purpose] as const),
    );
    const requests = new Map<string, Array<{ entryPoint: string; purpose: string }>>(
        entryPoints.map((entryPoint) => [entryPoint.block.id, []]),
    );
    const requestedBy = new Map<string, Array<{ entryPoint: string; purpose: string }>>(
        entryPoints.map((entryPoint) => [entryPoint.block.id, []]),
    );
    for (const request of yield* (yield* CodeGraph).findRequestsBetweenEntryPoints) {
        known(requests, request.one, "a request leaves an entry point").push({
            entryPoint: request.other,
            purpose: known(purposeOf, request.other, "a request reaches an entry point"),
        });
        known(requestedBy, request.other, "a request reaches an entry point").push({
            entryPoint: request.one,
            purpose: known(purposeOf, request.one, "a request leaves an entry point"),
        });
    }
    return { requests, requestedBy };
});

type EntryPointRecord = Effect.Success<ReturnType<typeof readEntryPoints>>["entryPoints"][number];

/**
 * Every entry point as a unit of a entry-point job, with what the Map holds about it: what it is, who starts it and how it is
 * reached, its part, the entry points its chain requests and that request it with what each does, the resources its chain
 * uses, and what navigation shows for it, each with the lines that show it, each decoded by its schema as it is made
 * and given to `onUnit` in location order, the order jobs are packed in. Read a page of entry points at a time (D218): one
 * statement for their resources over the reach of every entry point . No unit is held after `onUnit`
 * takes it; the entry points themselves are held, to order them.
 * @param onUnit what takes each unit
 * @returns nothing once every unit is given
 */
export const forEachEntryPointUnit = <E, R>(onUnit: (unit: EntryPointFacts) => Effect.Effect<void, E, R>) =>
    Effect.gen(function* () {
        const graph = yield* CodeGraph;
        const partHolding = yield* readPartOf();
        const entryPoints = [...(yield* readEntryPoints()).entryPoints].sort((left, right) =>
            byLocation({ ...left.block.lines, id: left.block.id }, { ...right.block.lines, id: right.block.id }),
        );
        const { requests, requestedBy } = yield* requestsOf(entryPoints);
        for (let at = 0; at < entryPoints.length; at += recordsPerPage) {
            const page = entryPoints.slice(at, at + recordsPerPage);
            const ids = page.map((entryPoint) => entryPoint.block.id);
            const usesOf = new Map<string, Array<typeof EntryPointResourceRow.Type>>();
            for (const use of yield* graph.findResourcesReachedFromEach(ids)) {
                getOrCreate(usesOf, use.entryPoint).push(use);
            }
            for (const { block, entryPoint } of page) {
                const part = partHolding(block.lines.file);
                const uses = usesOf.get(block.id);
                const unit = {
                    id: block.id,
                    ...(block.writtenAs === undefined ? {} : { writtenAs: block.writtenAs }),
                    ...(block.container === undefined ? {} : { container: block.container }),
                    purpose: entryPoint.purpose,
                    reachedBy: entryPoint.reachedBy,
                    startedBy: entryPoint.startedBy,
                    ...(part === undefined ? {} : { part: part.name }),
                    lines: block.lines,
                    requests: known(requests, block.id, "every entry point has its list"),
                    requestedBy: known(requestedBy, block.id, "every entry point has its list"),
                    resources: resourceUsesOf(uses === undefined ? [] : uses),
                };
                yield* onUnit(Schema.decodeUnknownSync(EntryPointUnit)(unit));
            }
        }
    });

/**
 * Each resource at an external system as a unit of a resource job (D218): every one a link saves or reads, or a data
 * definition declares, at any external system (a data store, a queue, a service), each once, with the id a script issued
 * it, the definitions declaring it (their layer and fields), the fields its saves and reads name, its uses counted by link
 * kind and layer, never cut short, and the parts whose entry points use it. An operation of a library (code with no
 * source here) is never a unit: it is how work leaves the analysed code, never data (P12.3). In location order (external
 * system, then where the Map first wrote it, `byPlace`), so resources of one data layer sit side by side for the cut to
 * pack together.
 * Held whole: bounded by the resources and their declarations, never by the lines of code.
 * @returns the units, each decoded by its schema
 */
export const readResourceUnits = Effect.fnUntraced(function* () {
    const reads = yield* RecordReads;
    const systems = yield* Stream.runCollect(reads.recordsOfType("ExternalSystem", ExternalSystem));
    const blocks = yield* readCodeKinds();
    const partHolding = yield* readPartOf();
    const units: Draft[] = [];
    const byExternalSystem = new Map<string, Map<string, Draft>>();
    const unitOf = (externalSystem: string, resource: string) => {
        let resources = byExternalSystem.get(externalSystem);
        if (resources === undefined) {
            resources = new Map();
            byExternalSystem.set(externalSystem, resources);
        }
        const found = resources.get(resource);
        if (found !== undefined) {
            return found;
        }
        const made: Draft = {
            id: resourceIdOf(externalSystem, resource),
            externalSystem,
            resource,
            definitions: [],
            fieldsUsed: [],
            uses: [],
            parts: [],
            neighbours: [],
        };
        resources.set(resource, made);
        units.push(made);
        return made;
    };
    for (const use of yield* (yield* CodeGraph).countResourceUsesByLayer) {
        const layer = use.layer === null ? undefined : blocks.layerName(use.layer);
        unitOf(use.externalSystem, use.resource).uses.push({
            kind: use.kind,
            ...(layer === undefined ? {} : { layerName: layer }),
            count: use.count,
        });
    }
    for (const system of systems) {
        const shapes = yield* readShapesDeclaredAt(system.id);
        for (const { externalSystem, resource } of shapes.declared) {
            if (externalSystem === system.id) {
                unitOf(externalSystem, resource).definitions.push(
                    ...shapes.declaring(externalSystem, resource).map((definition) => shapeOf(definition, blocks)),
                );
            }
        }
    }
    yield* addPartsAndFields(byExternalSystem, partHolding);
    yield* addNeighbours(units);
    const libraries = new Set<string>(systems.filter((system) => system.kind === "library").map((system) => system.id));
    const kept = units.filter((unit) => !libraries.has(unit.externalSystem));
    const issued = yield* (yield* CodeGraph).findResourcesByIds(kept.map((unit) => unit.id));
    const rankOf = new Map(issued.map((each, rank) => [each.id, rank] as const));
    return kept
        .map((unit) => Schema.decodeUnknownSync(ResourceUnit)(unit))
        .sort(byPlace(systems, (unit) => known(rankOf, unit.id, "the store issued an id to every resource")));
});

/**
 * Give each resource unit the parts whose entry points use it and the fields its saves and reads name.
 * @param byExternalSystem the units, by external system and resource
 * @param partHolding the part holding a path
 * @returns nothing once given
 */
const addPartsAndFields = Effect.fnUntraced(function* (
    byExternalSystem: ReadonlyMap<string, ReadonlyMap<string, Draft>>,
    partHolding: (path: string) => { readonly name: string } | undefined,
) {
    const graph = yield* CodeGraph;
    for (const { externalSystem, resource, file } of yield* graph.findFilesOfEntryPointsUsingEach) {
        const part = partHolding(file);
        const atSystem = byExternalSystem.get(externalSystem);
        const unit = atSystem === undefined ? undefined : atSystem.get(resource);
        if (part !== undefined && unit !== undefined && !unit.parts.includes(part.name)) {
            unit.parts.push(part.name);
        }
    }
    for (const atSystem of byExternalSystem.values()) {
        for (const unit of atSystem.values()) {
            unit.fieldsUsed = [...(yield* graph.findFieldsNamedAt(unit.externalSystem, unit.resource))];
        }
    }
});

/**
 * Resource units' location order (D218): by external system as recorded, then by where the Map first wrote the
 * resource, a link using it or a data definition declaring it, so resources of one data layer sit side by side for the cut
 * to pack together. Nothing in a resource's spelling decides it.
 * @param systems the external systems, in the order recorded
 * @param rankOf where the Map first wrote a unit's resource: the order the store issued its id in
 * @returns the comparison
 */
const byPlace = <U extends { readonly externalSystem: string }>(
    systems: ReadonlyArray<{ readonly id: string }>,
    rankOf: (unit: U) => number,
) => {
    const systemOrder = new Map(systems.map((system, i) => [system.id, i]));
    return (left: U, right: U) =>
        known(systemOrder, left.externalSystem, "a unit is at an external system") -
            known(systemOrder, right.externalSystem, "a unit is at an external system") || rankOf(left) - rankOf(right);
};

export type Draft = {
    readonly id: string;
    readonly externalSystem: string;
    readonly resource: string;
    readonly definitions: Array<ReturnType<typeof shapeOf>>;
    fieldsUsed: string[];
    readonly uses: Array<{ readonly kind: string; readonly layerName?: string; readonly count: number }>;
    readonly parts: string[];
    neighbours: string[];
};

/**
 * One data definition as a resource unit shows it: its name, its layer, its lines and its fields.
 * @param definition the definition
 * @param blocks the code kinds, for the definition's layer
 * @returns the definition as the unit holds it
 */
function shapeOf(definition: typeof DataDefinition.Type, blocks: CodeKinds) {
    const layer = blocks.layerNameOf(definition);
    return {
        writtenAs: definition.writtenAs,
        ...(layer === undefined ? {} : { layerName: layer }),
        lines: definition.lines,
        fields: definition.fields.map(({ writtenAs, declaredAs }) => ({ writtenAs, declaredAs })),
    };
}

/**
 * Each data definition declaring no resource as a unit of a shape job (the shape of what a person sees and
 * enters, a request object, a domain class): its name, layer, lines and fields, decoded by its schema and given to `onUnit` in location order, the order
 * jobs are packed in. A definition declaring a resource belongs to that resource's entity (D28), so it is no unit. Only
 * the definitions' positions are held, to order them; the definitions are read a page at a time in that order.
 * @param onUnit what takes each unit
 * @returns nothing once every unit is given
 */
export const forEachShapeUnit = <E, R>(onUnit: (unit: typeof ShapeUnit.Type) => Effect.Effect<void, E, R>) =>
    Effect.gen(function* () {
        const reads = yield* RecordReads;
        const blocks = yield* readCodeKinds();
        const positions = [...(yield* reads.positionsOfType("DataDefinition"))].sort(byLocation);
        for (let at = 0; at < positions.length; at += recordsPerPage) {
            const ids = positions.slice(at, at + recordsPerPage).map((position) => position.id);
            const byId = new Map(
                (yield* reads.findRecordsByIds("DataDefinition", ids, DataDefinition)).map((definition) => [
                    definition.id,
                    definition,
                ]),
            );
            for (const id of ids) {
                const definition = known(byId, id, "a position names a data definition");
                if (definition.declares === undefined) {
                    yield* onUnit(
                        Schema.decodeUnknownSync(ShapeUnit)({
                            definition: definition.id,
                            ...shapeOf(definition, blocks),
                        }),
                    );
                }
            }
        }
    });

/**
 * `uses`: every use of one resource, with its kind and the lines that use it, and every data definition declaring
 * it: the evidence a resource job's counts summarise, for its agent and reviewer. Read by that resource alone.
 * @param id the resource's id, as its job lists it
 * @returns one line per use and per declaration; UsageInvalid for an id the store issued to no resource
 */
export const readResourceUses = Effect.fnUntraced(function* (id: string) {
    const [pair] = yield* (yield* CodeGraph).findResourcesByIds([id]);
    if (pair === undefined) {
        return yield* new UsageInvalid({ issue: `${id} is the id of no resource the record store holds` });
    }
    const { externalSystem, resource } = pair;
    const uses = yield* (yield* CodeGraph).findLinksUsing(externalSystem, resource);
    const declaring = (yield* readShapesDeclaredAt(externalSystem)).declaring(externalSystem, resource);
    return [
        ...declaring.map((definition) => `declares ${definition.writtenAs}: ${lineSpan(definition.lines)}`),
        ...uses.map((link) => `${link.kind}: ${lineSpan(link.lines)}`),
    ];
});
