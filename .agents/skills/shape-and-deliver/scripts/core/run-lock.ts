import { DateTime, Effect, Schema } from "effect";
import { RunLocked } from "./script-errors";
import { System } from "./system";

/** Who holds a run: the driver's process and when it took the lock. */
const Holder = Schema.Struct({ pid: Schema.Number, at: Schema.String });

/**
 * Says who holds a lock file, as the refusal words it, and whether that driver is gone.
 * @param path the lock file
 * @returns the holder's process and time, and whether its process is gone; a file that does not read counts as held
 */
const holderOf = Effect.fnUntraced(function* (path: string) {
    const system = yield* System;
    const text = yield* system.readText(path).pipe(Effect.orElseSucceed(() => ""));
    const holder = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Holder))(text).pipe(Effect.option);
    if (holder._tag === "None") {
        return { said: "an unreadable lock", gone: false };
    }
    const { pid, at } = holder.value;
    return { said: `process ${pid} since ${at}`, gone: !(yield* system.isRunning(pid)) };
});

/**
 * Takes a run's lock, runs the step, and releases the lock when the step ends, however it ends. The lock is a file
 * created exclusively that records the process and time. A lock whose process is gone (a driver killed before it could
 * release) is taken over once; any other lock refuses the second driver. Two drivers finding the same stale lock at
 * the same instant could still both take it over; that window is accepted.
 * @param path the run's lock file
 * @param step what the driver does while it holds the run
 * @returns what the step gives
 * Writes: the lock file, removed when the step ends.
 * Fails: RunLocked when another driver holds the run, and whatever the step fails with.
 */
export const withRunLock = <A, E, R>(path: string, step: Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
        Effect.gen(function* () {
            const system = yield* System;
            const record = JSON.stringify({
                pid: yield* system.processId,
                at: DateTime.formatIso(yield* DateTime.now),
            });
            if (yield* system.createExclusive(path, record)) {
                return;
            }
            const held = yield* holderOf(path);
            if (held.gone) {
                yield* system.remove(path);
                if (yield* system.createExclusive(path, record)) {
                    return;
                }
            }
            return yield* new RunLocked({ path, holder: held.said });
        }),
        () => step,
        () =>
            Effect.gen(function* () {
                yield* (yield* System).remove(path);
            }).pipe(Effect.orDie),
    );
