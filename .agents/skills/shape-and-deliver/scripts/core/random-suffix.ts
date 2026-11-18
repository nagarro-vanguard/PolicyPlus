import { Effect, Random } from "effect";

/**
 * Eight random lower case hex digits, from the `Random` the caller provides, to tell one batch or draft file apart from another.
 * @returns the digits, as text
 */
export const randomSuffix = Effect.gen(function* () {
    return (yield* Random.nextIntBetween(0, 0xffffffff)).toString(16).padStart(8, "0");
});
