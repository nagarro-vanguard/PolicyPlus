import { Console, Context, Effect, Layer, Ref } from "effect";

export type ProgressEvent = {
    readonly step: string;
    readonly done: number;
    readonly of: number;
    readonly what: string;
};

/**
 * An event as the console prints it, one line.
 * @param event the event
 * @returns the line, without its line break
 */
const progressLine = (event: ProgressEvent) => `${event.step}: ${event.done} of ${event.of} ${event.what}`;

/**
 * Whole percent of a step done, as the console shows it.
 * @param event the event
 * @returns the percent, rounded down
 */
const percentOf = (event: ProgressEvent) => Math.floor((100 * event.done) / event.of);

export class Progress extends Context.Service<
    Progress,
    { readonly report: (event: ProgressEvent) => Effect.Effect<void> }
>()("code-analysis/core/Progress") {
    static readonly layer: Layer.Layer<Progress> = Layer.effect(
        Progress,
        Effect.map(Ref.make(new Map<string, number>()), (shown) =>
            Progress.of({
                report: (event) =>
                    Ref.modify(shown, (percents) => {
                        const percent = percentOf(event);
                        const changed = percents.get(event.step) !== percent;
                        return [changed, changed ? new Map(percents).set(event.step, percent) : percents];
                    }).pipe(Effect.flatMap((changed) => (changed ? Console.error(progressLine(event)) : Effect.void))),
            }),
        ),
    );
}

/**
 * A counter of one step's finished units: each run of the effect it gives reports the next unit done to `Progress`,
 * where every stage reports, one event per finished unit (D40). Its console layer prints an event to standard error
 * when the step's whole percent changes, which its last unit always does, so a step prints at most 101 lines at any size and
 * standard output keeps each command's result.
 * @param step the step, as `<stage> <verb>`
 * @param of how many units the step has
 * @param what what one unit is, in words that follow a count
 * @returns the effect reporting one more unit done
 */
export const countProgress = Effect.fnUntraced(function* (step: string, of: number, what: string) {
    const progress = yield* Progress;
    const done = yield* Ref.make(0);
    return Ref.updateAndGet(done, (count) => count + 1).pipe(
        Effect.flatMap((count) => progress.report({ step, done: count, of, what })),
    );
});
