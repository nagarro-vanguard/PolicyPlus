import { Effect } from "effect";
import { RandomIds } from "../../shared/run/hashing-and-random";
import { recordIdDigits } from "../../shared/model/record-ids";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import type { ListedFile } from "./list-files";

/**
 * The `Unread` records of a listing: each range of lines no reader can read, found by a script's detectors (`minified`,
 * `encodedData`), issued its record id here, once, since a script alone writes it. A file that copies another is read as
 * its original, so its ranges are the original's.
 * @param files the measured files
 * @returns one record per range, in file and line order, each as `Unread` holds it
 */
export const unreadRecordsOf = Effect.fnUntraced(function* (files: readonly ListedFile[]) {
    const ranges = files
        .filter((file) => file.copyOf === undefined)
        .flatMap((file) => file.unread.map((range) => ({ file: file.path, ...range })));
    const ids = yield* (yield* RandomIds).next(RecordIdPrefix.Unread, ranges.length, recordIdDigits);
    return ranges.map(({ file, firstLine, lastLine, why, evidence }, at) => ({
        id: ids[at],
        lines: { file, firstLine, lastLine },
        why,
        evidence,
    }));
});
