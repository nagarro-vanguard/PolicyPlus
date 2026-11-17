import { Effect, Stream } from "effect";
import { getOrCreate, known } from "../run/collections";
import { resourceIdOf } from "../model/resource-ids";
import { ResourceAssignment, ShapeAssignment } from "../model/schemas/assignment";
import { Entity } from "../model/schemas/entity";
import { DataDefinition } from "../model/schemas/map";
import { CodeGraph } from "../graph/code-graph";
import { RecordReads } from "./record-reads";

type EntityRecord = Entity;

type Assigned = { readonly entity?: string };

export type EntityIndex = {
    readonly entities: readonly EntityRecord[];
    readonly entityOf: (externalSystem: string, resource: string) => EntityRecord | undefined;
    readonly resourcesOf: (
        entity: EntityRecord,
    ) => ReadonlyArray<{ readonly externalSystem: string; readonly resource: string }>;
    readonly shapesOf: (entity: EntityRecord) => readonly string[];
};

/**
 * The entity index (P10): each resource an external system keeps, and each data shape that declares none, to the entity
 * its assignment gives (D30), derived in memory and never stored. Each resource and shape is assigned once by its
 * identity, so the index never has to choose. A resource or shape with no entity (none fits yet, or it keeps no kind
 * of data) is a real state: `entityOf` answers none for it.
 * @param entities the entities, in the order accepted
 * @param resources the resource assignments
 * @param shapes the shape assignments
 * @param pairOf each assigned resource's external system and spelling, by its id
 * @returns the index; `readEntityIndex` builds it from the store, and the stage's `show` from what it has read
 */
function indexEntities(
    entities: readonly EntityRecord[],
    resources: ReadonlyArray<typeof ResourceAssignment.Type>,
    shapes: ReadonlyArray<typeof ShapeAssignment.Type>,
    pairOf: ReadonlyMap<string, { readonly externalSystem: string; readonly resource: string }>,
): EntityIndex {
    const byId = new Map(entities.map((entity) => [entity.id, entity]));
    const entityOfAssignment = (assignment: Assigned) =>
        assignment.entity === undefined
            ? undefined
            : known(byId, assignment.entity, "the store's foreign keys hold it");
    const byResource = new Map<string, EntityRecord>();
    const kept = new Map<EntityRecord, Array<{ externalSystem: string; resource: string }>>();
    for (const assignment of resources) {
        const entity = entityOfAssignment(assignment);
        const pair = pairOf.get(assignment.resource);
        if (entity !== undefined && pair !== undefined) {
            byResource.set(assignment.resource, entity);
            getOrCreate(kept, entity).push(pair);
        }
    }
    const shaped = new Map<EntityRecord, string[]>();
    for (const assignment of shapes) {
        const entity = entityOfAssignment(assignment);
        if (entity !== undefined) {
            getOrCreate(shaped, entity).push(assignment.definition);
        }
    }
    const listed = <T>(map: ReadonlyMap<EntityRecord, readonly T[]>, entity: EntityRecord) => {
        const found = map.get(entity);
        return found === undefined ? [] : found;
    };
    return {
        entities,
        entityOf: (externalSystem, resource) => byResource.get(resourceIdOf(externalSystem, resource)),
        resourcesOf: (entity) => listed(kept, entity),
        shapesOf: (entity) => listed(shaped, entity),
    };
}

/**
 * The entities and their index, read from the record store: whole-set reads, bounded by the kinds of data, the
 * resources and the shapes, never by the code.
 * @returns the index
 */
export const readEntityIndex = Effect.fnUntraced(function* () {
    const reads = yield* RecordReads;
    const resources = yield* Stream.runCollect(reads.recordsOfType("ResourceAssignment", ResourceAssignment));
    const pairs = yield* (yield* CodeGraph).findResourcesByIds(resources.map((assignment) => assignment.resource));
    return indexEntities(
        yield* Stream.runCollect(reads.recordsOfType("Entity", Entity)),
        resources,
        yield* Stream.runCollect(reads.recordsOfType("ShapeAssignment", ShapeAssignment)),
        new Map(pairs.map((pair) => [pair.id, pair] as const)),
    );
});

/**
 * Which groups use which entities, by link kind (P10: which capabilities save and read which entities): each group's
 * uses of each resource, read through the entity index, the counts of resources one entity holds summed. A resource
 * no entity holds names none, so its uses count for no entity.
 * @param index the entity index
 * @param uses each group's uses of each resource, by link kind, in the order the store gives them
 * @returns each group's uses of each entity, by link kind, in the order first met
 */
export function entityUsesOf(
    index: EntityIndex,
    uses: ReadonlyArray<{
        readonly key: string;
        readonly externalSystem: string;
        readonly resource: string;
        readonly kind: string;
        readonly count: number;
    }>,
) {
    const found = new Map<string, { key: string; entity: EntityRecord; kind: string; count: number }>();
    for (const use of uses) {
        const entity = index.entityOf(use.externalSystem, use.resource);
        if (entity === undefined) {
            continue;
        }
        const key = JSON.stringify([use.key, entity.id, use.kind]);
        const seen = found.get(key);
        found.set(key, {
            key: use.key,
            entity,
            kind: use.kind,
            count: seen === undefined ? use.count : seen.count + use.count,
        });
    }
    return [...found.values()];
}

/**
 * The resources some uses touch, each once with every kind of use, in the order first met: one rule for the resources
 * an entry point's links use and the resources its chain reaches. A use at no external system touches no resource. Resources are
 * told apart by their id, which is their external system and their spelling.
 * @param uses each use: the external system and resource it reaches, if any, and its kind
 * @returns each resource used, with its kinds, each once
 */
export function resourceUsesOf<K extends string>(
    uses: ReadonlyArray<{ readonly externalSystem?: string; readonly resource?: string; readonly kind: K }>,
) {
    const found: Array<{ id: string; externalSystem: string; resource: string; kinds: K[] }> = [];
    const byId = new Map<string, (typeof found)[number]>();
    for (const { externalSystem, resource, kind } of uses) {
        if (externalSystem !== undefined && resource !== undefined) {
            const id = resourceIdOf(externalSystem, resource);
            const seen = byId.get(id);
            if (seen === undefined) {
                const use = { id, externalSystem, resource, kinds: [kind] };
                byId.set(id, use);
                found.push(use);
            } else if (!seen.kinds.includes(kind)) {
                seen.kinds.push(kind);
            }
        }
    }
    return found;
}

type Shape = typeof DataDefinition.Type;

export type DeclaredShapes = {
    readonly declared: ReadonlyArray<{ readonly externalSystem: string; readonly resource: string }>;
    readonly declaring: (externalSystem: string, resource: string) => readonly Shape[];
};

/**
 * The data definitions declaring each resource (D28), the one rule: a shape declaring a resource belongs to the entity
 * holding it, so it is found through its `declares`, never copied into an entity.
 * @param definitions the data definitions read
 * @returns the resources declared, each once in the order first declared, and the definitions declaring each, in the
 * order written; none for a resource no definition read declares
 */
function indexDeclaredShapes(definitions: Iterable<Shape>): DeclaredShapes {
    const byResource = new Map<string, { externalSystem: string; resource: string; shapes: Shape[] }>();
    for (const definition of definitions) {
        if (definition.declares !== undefined) {
            const { externalSystem, resource } = definition.declares;
            const key = resourceIdOf(externalSystem, resource);
            const listed = byResource.get(key);
            if (listed === undefined) {
                byResource.set(key, { externalSystem, resource, shapes: [definition] });
            } else {
                listed.shapes.push(definition);
            }
        }
    }
    return {
        declared: [...byResource.values()].map(({ externalSystem, resource }) => ({ externalSystem, resource })),
        declaring: (externalSystem, resource) => {
            const listed = byResource.get(resourceIdOf(externalSystem, resource));
            return listed === undefined ? [] : listed.shapes;
        },
    };
}

/**
 * The data definitions declaring a resource at one external system, indexed by it: read through their citation of the
 * external system, so bounded by that external system's declarations.
 * @param externalSystem the external system's record id
 * @returns the declared shapes
 */
export const readShapesDeclaredAt = Effect.fnUntraced(function* (externalSystem: string) {
    return indexDeclaredShapes(
        yield* (yield* RecordReads).findRecordsCiting([externalSystem], "DataDefinition", DataDefinition),
    );
});
