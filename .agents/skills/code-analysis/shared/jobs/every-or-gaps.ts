import { Effect } from "effect";
import { GapsRemain } from "../run/script-errors";

/**
 * Each item's result, or every gap of every item that has gaps: a refusal names them all at once, so one run of the
 * reviews closes every one.
 * @param items the items
 * @param decide one item's result, or GapsRemain
 * @param finished what reports each item decided, gaps or not
 * @returns the results, in the items' order; GapsRemain naming each gap
 */
export const everyOrGaps = Effect.fnUntraced(function* <I, A, E, R>(
    items: readonly I[],
    decide: (item: I) => Effect.Effect<A, E | GapsRemain, R>,
    finished: Effect.Effect<void>,
) {
    const results: A[] = [];
    const gaps: string[] = [];
    for (const item of items) {
        const decided = yield* decide(item).pipe(
            Effect.map((result) => ({ result }) as const),
            Effect.catchIf(
                (error): error is GapsRemain => error instanceof GapsRemain,
                (refused) => Effect.succeed({ gaps: refused.gaps } as const),
            ),
        );
        yield* finished;
        if ("gaps" in decided) {
            gaps.push(...decided.gaps);
        } else {
            results.push(decided.result);
        }
    }
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
    return results;
});
