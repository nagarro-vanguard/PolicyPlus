import { createHash, getRandomValues } from "node:crypto";
import { Context, Effect, Layer } from "effect";

/**
 * The SHA-1 of a text or of bytes, in hexadecimal: how exact copies of files are spotted, and how a Capabilities and
 * entities job's units are told unchanged from one cut to the next.
 * @param content the text or bytes
 * @returns 40 hexadecimal characters
 */
export const sha1Hex = (content: string | Uint8Array): string => createHash("sha1").update(content).digest("hex");

/**
 * A SHA-1 taken over many texts in turn, so a stage's records are digested a page at a time, never held whole: what
 * tells a stage's write by its content (D230).
 * @returns the hash: `update` each text in order, then `hex` once
 */
export const sha1Hasher = () => {
    const hash = createHash("sha1");
    return {
        update: (text: string) => {
            hash.update(text);
        },
        hex: () => hash.digest("hex"),
    };
};

/**
 * `count` random decimal digits, each equally likely: a byte of 250 or more is drawn again, since 250 is the largest
 * multiple of ten a byte can hold, so taking the rest after dividing by ten favours no digit.
 * @param count how many digits
 * @returns the digits
 */
function randomDigits(count: number): string {
    let digits = "";
    while (digits.length < count) {
        for (const byte of getRandomValues(new Uint8Array(count))) {
            if (byte < 250 && digits.length < count) {
                digits += String(byte % 10);
            }
        }
    }
    return digits;
}

export interface RandomIdsOps {
    readonly next: (prefix: string, count: number, digits: number) => Effect.Effect<string[]>;
}

const randomIdsOps: RandomIdsOps = {
    /**
     * Fresh record ids or job ids: the prefix, a hyphen and random digits. They need no shared counter, so agents writing in parallel
     * share no file; the digits make two equal ids too unlikely to plan for, and each owner still checks the ids it
     * holds for a repeat.
     * @param prefix the record type's or job kind's prefix
     * @param count how many ids
     * @param digits how many random digits each id has
     * @returns the ids
     */
    next: (prefix, count, digits) =>
        Effect.sync(() => Array.from({ length: count }, () => `${prefix}-${randomDigits(digits)}`)),
};

export class RandomIds extends Context.Service<RandomIds, RandomIdsOps>()("code-analysis/core/RandomIds") {
    static readonly layer: Layer.Layer<RandomIds> = Layer.succeed(RandomIds, RandomIds.of(randomIdsOps));
}
