import { Effect, Schema } from "effect";
import { unique } from "../../shared/run/collections";
import type { Catalogue } from "../../shared/run/catalogue";
import { SurfaceKind } from "../../shared/model/schemas/surface-kind";
import { Text, about } from "../../shared/model/shared-fields";
import { readSurfaceModel, type EntryRow } from "../../shared/read/surfaces";
import { RecordStore } from "../../shared/store/database";
import { decodedRows } from "../../shared/store/stored-bodies";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const Words = Schema.Array(Text);

const NamedRow = Schema.Struct({ id: Schema.String, name: Schema.String });

export const BriefScreen = Schema.Struct({
    line: Schema.Literal("screen"),
    key: Text.annotate(
        about(
            "The candidate place's key: the path of its page file without its extension, or of the file its entry points start in.",
        ),
    ),
    files: Words.annotate(about("The files its entry points start in.")),
    actions: Count.annotate(about("How many entry points start there.")),
    purposes: Words.annotate(about("What its first three entry points do, as the Map wrote it.")),
    capabilities: Words.annotate(about("The capabilities whose entry points start there.")),
    kind: Schema.optionalKey(
        SurfaceKind.annotate(
            about("The kind the code suggests, from its entry points' code kinds and who starts them; yours to judge."),
        ),
    ),
    name: Schema.optionalKey(
        Text.annotate(about("The name it gets when no one names it: its one class, or its file's name.")),
    ),
    startedBy: Schema.optionalKey(
        Schema.Struct({ person: Count, schedule: Count, otherSystem: Count }).annotate(
            about("How many of its entry points a person, a schedule and another system start."),
        ),
    ),
}).annotate(
    about(
        "One candidate place, found by script from where entry points lie, whoever starts them (test suites are grouped by script and not briefed); the briefing groups these into the places people would name and gives each its kind.",
    ),
);

export const BriefKind = Schema.Struct({
    line: Schema.Literal("kind"),
    kind: SurfaceKind,
    one: Text.annotate(about("The reader's noun for one place of this kind.")),
    many: Text.annotate(about("The noun for several.")),
    means: Text.annotate(about("What a place of this kind is.")),
}).annotate(about("One kind of place a `Screen` may take, from the closed list, with its reader nouns."));

/**
 * The candidate places: every place entry points start, whoever starts them, grouped the way the pages group them (a
 * page's markup, code behind and script together), each with the kind the code suggests, what its first entry points do
 * and the capabilities that hold them. Test suites are grouped and named by script, so they are not briefed. Then one
 * line per kind of place on the closed list, with its nouns.
 * @param catalogue the catalogue, for the kinds' nouns
 * @returns the lines
 */
export const screenLines = Effect.fnUntraced(function* (catalogue: Catalogue) {
    const store = yield* RecordStore;
    const model = yield* readSurfaceModel(store, catalogue);
    const names = new Map(
        (yield* Effect.orDie(
            store.query((sql) =>
                decodedRows(NamedRow)(
                    sql`SELECT id, json_extract(body, '$.name') AS name FROM record WHERE type = 'Capability'`,
                ),
            ),
        )).map((row) => [row.id, row.name] as const),
    );
    const count = (entries: readonly EntryRow[], who: string) =>
        entries.filter((each) => each.startedBy === who).length;
    const candidates = model.candidates
        .filter((candidate) => candidate.kind !== "test")
        .map((candidate): typeof BriefScreen.Encoded => ({
            line: "screen",
            key: candidate.key,
            files: unique(candidate.entries.map((entry) => entry.file)),
            actions: candidate.entries.length,
            purposes: candidate.entries.flatMap((entry) => (entry.purpose === null ? [] : [entry.purpose])).slice(0, 3),
            capabilities: unique(
                candidate.entries.flatMap((entry) => {
                    const name = entry.capability === null ? undefined : names.get(entry.capability);
                    return name === undefined ? [] : [name];
                }),
            ),
            kind: candidate.kind,
            name: candidate.name,
            startedBy: {
                person: count(candidate.entries, "person"),
                schedule: count(candidate.entries, "schedule"),
                otherSystem: count(candidate.entries, "otherSystem"),
            },
        }));
    const kinds = catalogue.surfaceKinds.map((kind): typeof BriefKind.Encoded => ({
        line: "kind",
        kind: kind.id,
        one: kind.one,
        many: kind.many,
        means: kind.means,
    }));
    return [...candidates, ...kinds];
});

const PurposeRow = Schema.Struct({ statement: Schema.String });

/**
 * What the system is for, as How it runs stated it: none when no fact states it.
 * @returns the purpose, as the system line holds it
 */
export const systemPurpose = Effect.fnUntraced(function* () {
    const store = yield* RecordStore;
    const [row] = yield* Effect.orDie(
        store.query((sql) =>
            decodedRows(PurposeRow)(
                sql`SELECT statement FROM v_fact WHERE subjectRegistry = 'system' AND aspect = 'purpose' LIMIT 1`,
            ),
        ),
    );
    return row === undefined || row.statement === "" ? {} : { purpose: row.statement };
});
