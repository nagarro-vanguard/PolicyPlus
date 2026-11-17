import { Effect, Schema } from "effect";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { unique } from "../../shared/run/collections";
import { CodeGraph } from "../../shared/graph/code-graph";
import { readEntityIndex, readShapesDeclaredAt, type DeclaredShapes } from "../../shared/read/entity-index";
import { readRecordsById } from "../../shared/read/records-by-id";
import { DataDefinition, type Link } from "../../shared/model/schemas/map";
import { CapabilityRulesJob } from "../../shared/model/schemas/capability-rules-jobs";
import type { Job } from "./jobs";

type LinkRecord = typeof Link.Type;

type Resource = { readonly externalSystem: string; readonly resource: string };

/**
 * A job as the cut composes it, decoded by the job's schema: its facts come from accepted records, so a job the schema
 * refuses is a defect in the cut, never the person's.
 * @param units the job's kind and units, in their first state
 * @returns the job
 */
const asJob = (units: object): Job => Schema.decodeUnknownSync(CapabilityRulesJob)(units);

/**
 * The data shapes of one entity, each with its fields: those declaring one of its resources, and those assigned to it.
 * @param resources its resources
 * @param assigned the record ids of the data shapes assigned to it
 * @param declaredAt the shapes declaring resources at an external system, read once per external system
 * @returns the shapes, each once
 */
const shapesOfEntity = Effect.fnUntraced(function* <E, R>(
    resources: readonly Resource[],
    assigned: readonly string[],
    declaredAt: (externalSystem: string) => Effect.Effect<DeclaredShapes, E, R>,
) {
    const shapes = new Map<string, typeof DataDefinition.Type>();
    for (const { externalSystem, resource } of resources) {
        for (const shape of (yield* declaredAt(externalSystem)).declaring(externalSystem, resource)) {
            shapes.set(shape.id, shape);
        }
    }
    for (const shape of (yield* readRecordsById("DataDefinition", assigned, DataDefinition)).values()) {
        shapes.set(shape.id, shape);
    }
    return [...shapes.values()].map((shape) => ({
        definition: shape.id,
        writtenAs: shape.writtenAs,
        lines: shape.lines,
        fields: shape.fields.map((field) => ({ name: field.writtenAs, declaredAs: field.declaredAs })),
    }));
});

/**
 * Every save and read of an entity's resources anywhere in the system, each with whether an entry point runs the code making
 * it (D224): what its lifecycle job's file of uses holds, searched rather than inlined.
 * @param resources the entity's resources
 * @returns the uses, in the order the store gives them
 */
const usesOfEntity = Effect.fnUntraced(function* (resources: readonly Resource[]) {
    const graph = yield* CodeGraph;
    const uses: Array<{
        readonly link: string;
        readonly kind: string;
        readonly lines: LinkRecord["lines"];
        readonly externalSystem: string;
        readonly resource: string;
        readonly fieldsUsed?: readonly string[];
    }> = [];
    for (const { externalSystem, resource } of resources) {
        for (const link of yield* graph.findLinksUsing(externalSystem, resource)) {
            if (link.kind === "saves" || link.kind === "reads") {
                uses.push({
                    link: link.id,
                    kind: link.kind,
                    lines: link.lines,
                    externalSystem,
                    resource,
                    ...(link.fieldsUsed === undefined ? {} : { fieldsUsed: link.fieldsUsed }),
                });
            }
        }
    }
    const reached = new Set(yield* graph.findLinksReached(uses.map((use) => use.link)));
    return uses.map((use) => ({ ...use, reached: reached.has(use.link) }));
});

/**
 * One lifecycle job per entity the chosen capabilities save (D124, D224), each with every place in the whole system that
 * saves one of the entity's resources, none cut off, and every save and read in its
 * file of uses, so the life is read across every capability, never cut at the scope's edge, and never one job too
 * large. A saved resource no entity keeps (none fits it, or it keeps no kind of data) has no life to read: it is
 * returned for the person.
 * @param saved the resources the chosen capabilities save
 * @returns the lifecycle jobs, in their first state, each with its uses; the saved resources no entity keeps; and how
 * many jobs hold more saves than a job's budget, which are read whole all the same
 */
export const cutLifecycleJobs = Effect.fnUntraced(function* (saved: readonly Resource[]) {
    const graph = yield* CodeGraph;
    const index = yield* readEntityIndex();
    const budget = (yield* AnalysisConfig).capabilitiesAndEntitiesJobCharacters;
    const declared = new Map<string, DeclaredShapes>();
    const declaredAt = Effect.fnUntraced(function* (externalSystem: string) {
        const found = declared.get(externalSystem);
        if (found !== undefined) {
            return found;
        }
        const read = yield* readShapesDeclaredAt(externalSystem);
        declared.set(externalSystem, read);
        return read;
    });
    const unkept = saved.filter(
        ({ externalSystem, resource }) => index.entityOf(externalSystem, resource) === undefined,
    );
    const entities = unique(
        saved.flatMap(({ externalSystem, resource }) => {
            const entity = index.entityOf(externalSystem, resource);
            return entity === undefined ? [] : [entity];
        }),
    );
    const jobs: Array<{ readonly job: Job; readonly uses: readonly object[] }> = [];
    let overBudget = 0;
    for (const entity of entities) {
        const resources = index.resourcesOf(entity);
        const listed = [];
        for (const { externalSystem, resource } of resources) {
            listed.push({
                externalSystem,
                resource,
                fieldsUsed: yield* graph.findFieldsNamedAt(externalSystem, resource),
            });
        }
        const uses = yield* usesOfEntity(resources);
        const saves = uses.filter((use) => use.kind === "saves");
        overBudget += JSON.stringify(saves).length > budget ? 1 : 0;
        jobs.push({
            job: asJob({
                kind: "lifecycle",
                entity: { id: entity.id, name: entity.name, purpose: entity.purpose },
                resources: listed,
                shapes: yield* shapesOfEntity(resources, index.shapesOf(entity), declaredAt),
                saves,
            }),
            uses,
        });
    }
    return { jobs, unkept, overBudget };
});
