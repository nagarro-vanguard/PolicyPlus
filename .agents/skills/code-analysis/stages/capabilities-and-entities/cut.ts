import { Effect } from "effect";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import type {
    ResourceUnit,
    ShapeUnit,
    EntryPointUnit,
} from "../../shared/model/schemas/capabilities-and-entities-jobs";
import type { Units } from "./jobs";
import { forEachShapeUnit, forEachEntryPointUnit, readResourceUnits } from "./units";

type EntryPoint = typeof EntryPointUnit.Type;

type Resource = typeof ResourceUnit.Type;

type Shape = typeof ShapeUnit.Type;

/**
 * A packer of units into jobs in their order, each job up to the budget in characters of its units. A unit that does
 * not fit closes the job before it, and one larger than the budget is a job alone.
 * @param budget the most characters one job's units hold
 * @returns `add` a unit with its size (the job it closes, if any), and `end` (the last job, if any)
 */
function packer<U>(budget: number) {
    let job: U[] = [];
    let size = 0;
    return {
        add: (unit: U, length: number): readonly [U, ...U[]] | undefined => {
            const [first, ...rest] = job;
            const closed = first !== undefined && size + length > budget ? ([first, ...rest] as const) : undefined;
            if (closed !== undefined) {
                job = [];
                size = 0;
            }
            job.push(unit);
            size += length;
            return closed;
        },
        end: (): readonly [U, ...U[]] | undefined => {
            const [first, ...rest] = job;
            job = [];
            size = 0;
            return first === undefined ? undefined : [first, ...rest];
        },
    };
}

/**
 * Today's assigning jobs, cut as the units come: every entry point, then every resource, then every data shape, each
 * in location order (the order the Map wrote them), each packed to the budget, each job given to `onJob` as it closes,
 * so no step holds every unit.
 * @param onJob what takes each job, in cut order
 * @returns how many units are larger than the budget
 */
export const cutAssigning = <E, R>(onJob: (units: Units) => Effect.Effect<void, E, R>) =>
    Effect.gen(function* () {
        const budget = (yield* AnalysisConfig).capabilitiesAndEntitiesJobCharacters;
        let overBudget = 0;
        const measured = (unit: unknown) => {
            const length = JSON.stringify(unit).length;
            overBudget += length > budget ? 1 : 0;
            return length;
        };
        const close = (units: Units | undefined) => (units === undefined ? Effect.void : onJob(units));
        const entryPoints = packer<EntryPoint>(budget);
        yield* forEachEntryPointUnit((unit) =>
            Effect.suspend(() => {
                const closed = entryPoints.add(unit, measured(unit));
                return close(closed === undefined ? undefined : { kind: "assignEntryPoints", entryPoints: closed });
            }),
        );
        const lastEntryPoints = entryPoints.end();
        yield* close(
            lastEntryPoints === undefined ? undefined : { kind: "assignEntryPoints", entryPoints: lastEntryPoints },
        );
        const resources = packer<Resource>(budget);
        for (const unit of yield* readResourceUnits()) {
            const closed = resources.add(unit, measured(unit));
            yield* close(closed === undefined ? undefined : { kind: "assignResources", resources: closed });
        }
        const lastResources = resources.end();
        yield* close(lastResources === undefined ? undefined : { kind: "assignResources", resources: lastResources });
        const shapes = packer<Shape>(budget);
        yield* forEachShapeUnit((unit) =>
            Effect.suspend(() => {
                const closed = shapes.add(unit, measured(unit));
                return close(closed === undefined ? undefined : { kind: "assignShapes", shapes: closed });
            }),
        );
        const lastShapes = shapes.end();
        yield* close(lastShapes === undefined ? undefined : { kind: "assignShapes", shapes: lastShapes });
        return { overBudget };
    });
