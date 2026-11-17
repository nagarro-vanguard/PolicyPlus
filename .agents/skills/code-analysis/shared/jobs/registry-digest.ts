import { Effect } from "effect";
import { FileAccess } from "../source/file-access";
import { sha1Hex } from "../run/hashing-and-random";

/**
 * The registry a batch's agents read, as one digest: the hash and the size of the registry documents' bytes together,
 * so a later reader can tell which registry a batch ran against. None while no document exists.
 * @param paths the registry documents the agents read
 * @returns the digest, or none
 */
export const registryDigest = Effect.fnUntraced(function* (paths: readonly string[]) {
    const fs = yield* FileAccess;
    const held: Uint8Array[] = [];
    for (const path of paths) {
        if (yield* fs.exists(path)) {
            held.push(yield* fs.readBytes(path));
        }
    }
    if (!held.length) {
        return undefined;
    }
    const bytes = Buffer.concat(held);
    return { hash: sha1Hex(bytes), bytes: bytes.length };
});
