import { Effect, Stream } from "effect";
import { compareText, getOrCreate, known, unique } from "../../shared/run/collections";
import { resourceIdOf } from "../../shared/model/resource-ids";
import { CodeGraph } from "../../shared/graph/code-graph";
import { readEntryPoints } from "../../shared/graph/entry-points";
import { RecordReads } from "../../shared/read/record-reads";
import type { EntryPointResourceRow } from "../../shared/store/rows";
import { DataDefinition } from "../../shared/model/schemas/map";
import type { Draft } from "./units";

const neighboursKept = 8;

const resourceKeyOf = resourceIdOf;

/**
 * The resources each resource's data definitions refer to, or that refer to it (`refersTo`), both ways.
 * @param definitions every data definition
 * @returns the resources it is joined to, by its key
 */
function referencesOf(definitions: ReadonlyArray<typeof DataDefinition.Type>): Map<string, string[]> {
    const declaring = new Map<string, string>();
    for (const definition of definitions) {
        if (definition.declares !== undefined) {
            declaring.set(
                definition.id,
                resourceKeyOf(definition.declares.externalSystem, definition.declares.resource),
            );
        }
    }
    const joined = new Map<string, string[]>();
    for (const definition of definitions) {
        const from = declaring.get(definition.id);
        if (from === undefined) {
            continue;
        }
        for (const field of definition.fields) {
            const to = field.refersTo === undefined ? undefined : declaring.get(field.refersTo);
            if (to !== undefined && to !== from) {
                getOrCreate(joined, from).push(to);
                getOrCreate(joined, to).push(from);
            }
        }
    }
    return joined;
}

/**
 * The resources saved in the same entry point's flow as each one, most often first; a resource saved in more than a
 * tenth of all flows (a log, an audit trail) is everyone's neighbour and so no one's, and is left out.
 * @param rows each entry point's reach of resources, with how it uses each
 * @returns the others, by each resource's key
 */
function savedTogether(rows: ReadonlyArray<typeof EntryPointResourceRow.Type>): Map<string, string[]> {
    const savedBy = new Map<string, string[]>();
    for (const row of rows.filter((each) => each.kind === "saves")) {
        getOrCreate(savedBy, row.entryPoint).push(resourceKeyOf(row.externalSystem, row.resource));
    }
    const flowsSaving = new Map<string, number>();
    for (const saved of savedBy.values()) {
        for (const key of unique(saved)) {
            const count = flowsSaving.get(key);
            flowsSaving.set(key, count === undefined ? 1 : count + 1);
        }
    }
    const everywhere = new Set(
        [...flowsSaving].filter(([, count]) => count > Math.max(5, savedBy.size / 10)).map(([key]) => key),
    );
    const counts = new Map<string, Map<string, number>>();
    for (const saved of savedBy.values()) {
        const once = unique(saved).filter((key) => !everywhere.has(key));
        for (const one of once) {
            const ofOne = counts.get(one) === undefined ? new Map<string, number>() : known(counts, one, "set");
            counts.set(one, ofOne);
            for (const other of once.filter((each) => each !== one)) {
                const count = ofOne.get(other);
                ofOne.set(other, count === undefined ? 1 : count + 1);
            }
        }
    }
    return new Map(
        [...counts].map(([one, others]) => [
            one,
            [...others].sort((left, right) => right[1] - left[1] || compareText(left[0], right[0])).map(([key]) => key),
        ]),
    );
}

/**
 * Give each resource unit its neighbours (P12.6): the resources its data definitions refer to or that refer to it,
 * then those most often saved in the same entry point's flow, to `neighboursKept`. Bounded by the resources and the
 * entry points' reach, never by the lines of code.
 * @param units the units
 * @returns nothing once given
 */
export const addNeighbours = Effect.fnUntraced(function* (units: Draft[]) {
    const nameOf = new Map(
        units.map((unit) => [resourceKeyOf(unit.externalSystem, unit.resource), unit.resource] as const),
    );
    const joined = referencesOf(
        yield* Stream.runCollect((yield* RecordReads).recordsOfType("DataDefinition", DataDefinition)),
    );
    const { entryPoints } = yield* readEntryPoints();
    const together = savedTogether(
        yield* (yield* CodeGraph).findResourcesReachedFromEach(entryPoints.map((each) => each.block.id)),
    );
    for (const unit of units) {
        const key = resourceKeyOf(unit.externalSystem, unit.resource);
        const refers = joined.get(key);
        const saved = together.get(key);
        unit.neighbours = unique(
            [...(refers === undefined ? [] : [...refers].sort(compareText)), ...(saved === undefined ? [] : saved)]
                .filter((other) => other !== key)
                .flatMap((other) => {
                    const name = nameOf.get(other);
                    return name === undefined || name === unit.resource ? [] : [name];
                }),
        ).slice(0, neighboursKept);
    }
});
