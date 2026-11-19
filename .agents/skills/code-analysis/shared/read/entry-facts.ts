import { Effect, Schema } from "effect";
import { join } from "node:path";
import { compareText, getOrCreate, unique } from "../run/collections";
import { FileAccess } from "../source/file-access";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";
import { Evidence } from "./payload-words";
import { addressOf } from "./addresses";
import type { SurfaceModel } from "./surfaces";

/**
 * The text of some lines of the source, each file read once.
 * @param sourceFolder the folder every evidence file is relative to
 * @returns a reader of lines, giving an empty text for a file it cannot read
 */
const sourceLines = Effect.fnUntraced(function* (sourceFolder: string) {
    const files = yield* FileAccess;
    const cache = new Map<string, readonly string[]>();
    return Effect.fnUntraced(function* (place: { file: string; firstLine: number; lastLine: number }) {
        if (!cache.has(place.file)) {
            const text = yield* Effect.option(files.readText(join(sourceFolder, place.file)));
            cache.set(place.file, text._tag === "Some" ? text.value.split("\n") : []);
        }
        const rows = cache.get(place.file);
        return (rows === undefined ? [] : rows).slice(place.firstLine - 1, place.lastLine).join("\n");
    });
});

/**
 * The address of every web page and service entry point, copied from how it is reached and kept only where it stands,
 * character for character, in the lines that show it starts (`addressOf`). An analysis whose source cannot be read, or
 * that has none, gives none.
 * @param model the places
 * @param sourceFolder the source folder; none when the run's request is not there
 * @returns each address with the text it was found in, by entry point record id
 */
export const readAddresses = Effect.fnUntraced(function* (model: SurfaceModel, sourceFolder: string | undefined) {
    const found = new Map<string, { readonly address: string; readonly evidenceText: string }>();
    if (sourceFolder === undefined) {
        return found;
    }
    const linesOf = yield* sourceLines(sourceFolder);
    for (const entry of model.entries) {
        const kind = model.kindOf(entry);
        if ((kind !== "page" && kind !== "service") || entry.evidence === null || entry.reachedBy === null) {
            continue;
        }
        const places = Schema.decodeUnknownSync(Evidence)(entry.evidence);
        const texts: string[] = [];
        for (const place of places) {
            texts.push(yield* linesOf(place));
        }
        const evidenceText = texts.join("\n");
        const address = addressOf(
            entry.reachedBy,
            evidenceText,
            places.map((place) => place.file),
        );
        if (address !== undefined) {
            found.set(entry.id, { address, evidenceText });
        }
    }
    return found;
});

const ReachRow = Schema.Struct({ entry: Schema.String, rule: Schema.String, rulePart: Schema.NullOr(Schema.String) });

/**
 * The test suites that reach each rule: a test's flow reaches the block that decides it. A rule decided in a tests part
 * is the tests' own and is left out. Reaching is not checking: a test may pass through a rule without asserting it, so
 * a reader is told "reached by tests", never "checked".
 * @param store the record store, read only
 * @param model the places, for which entry points are tests and their suites
 * @returns the keys of the test suites reaching each rule, by rule record id
 */
export const readTestReach = Effect.fnUntraced(function* (store: RecordStore["Service"], model: SurfaceModel) {
    const tests = model.entries.filter((entry) => model.kindOf(entry) === "test").map((entry) => entry.id);
    const reach = new Map<string, string[]>();
    if (tests.length === 0) {
        return new Map<string, readonly string[]>();
    }
    const rows = yield* read(
        store,
        ReachRow,
        (sql) => sql`SELECT DISTINCT b.id AS entry, r.id AS rule, json_extract(p.body, '$.kind') AS rulePart
            FROM entryPointReach w JOIN record b ON b.recordNumber = w.entryPoint
            JOIN ruleBlock rb ON rb.block = w.block JOIN record r ON r.recordNumber = rb.rule
            LEFT JOIN filePart fp ON fp.fileNumber = r.fileNumber LEFT JOIN record p ON p.recordNumber = fp.part
            WHERE b.id IN (SELECT value FROM json_each(${JSON.stringify(tests)}))`,
    );
    for (const row of rows) {
        const suite = model.surfaceOf.get(row.entry);
        if (row.rulePart !== "tests" && suite !== undefined) {
            getOrCreate(reach, row.rule).push(suite.key);
        }
    }
    return new Map<string, readonly string[]>(
        [...reach].map(([rule, suites]) => [rule, unique(suites).toSorted(compareText)] as const),
    );
});
