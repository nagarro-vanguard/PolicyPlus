import { Effect, Schema } from "effect";
import type { Catalogue } from "../run/catalogue";
import { addToCount, compareText, getOrCreate, unique } from "../run/collections";
import { surfaceKinds, type SurfaceKind } from "../model/schemas/surface-kind";
import type { RecordStore } from "../store/database";
import { pagePathOf, placeKeyOf } from "./payload-context";
import { entryKeysOf } from "./payload-keys";
import { ScreenRecordRow, layerRoles, read } from "./payload-queries";

const MaybeText = Schema.NullOr(Schema.String);

const EntryRow = Schema.Struct({
    id: Schema.String,
    name: MaybeText,
    container: MaybeText,
    startedBy: Schema.String,
    reachedBy: MaybeText,
    purpose: MaybeText,
    evidence: MaybeText,
    file: Schema.String,
    firstLine: Schema.Number,
    lastLine: Schema.Number,
    codeKind: MaybeText,
    surfaceKind: MaybeText,
    layer: MaybeText,
    partKind: MaybeText,
    capability: MaybeText,
});

export type EntryRow = typeof EntryRow.Type;

type Entry = Pick<EntryRow, "id" | "file" | "startedBy" | "partKind" | "layer" | "codeKind" | "surfaceKind"> &
    Partial<Pick<EntryRow, "name" | "container" | "firstLine">>;

/**
 * Whether a file's name ends in one of some endings, case aside.
 * @param file the file
 * @param endings the endings
 * @returns true when it does
 */
const endsWithAny = (file: string, endings: readonly string[]) => {
    const lower = file.toLowerCase();
    return endings.some((ending) => lower.endsWith(ending));
};

const buildFiles = [
    "nbactions.xml",
    ".targets",
    ".props",
    ".csproj",
    ".vbproj",
    ".sln",
    "pom.xml",
    "build.gradle",
    "build.xml",
    "dockerfile",
    "makefile",
    ".nuspec",
    ".wxs",
];
const scriptFiles = [".ps1", ".psm1", ".cmd", ".bat", ".sh"];
const webFiles = [
    ".aspx",
    ".ascx",
    ".master",
    ".ashx",
    ".asmx",
    ".cshtml",
    ".vbhtml",
    ".jsp",
    ".jspf",
    ".html",
    ".htm",
    ".xhtml",
    ".js",
    ".vm",
    ".ftl",
    ".php",
];

/**
 * The kind of place one entry point belongs in, derived by code when no code kind states it: tests in a tests part
 * are tests; build files and the scripts of tooling are build steps; other scripts and tools are commands; what a
 * schedule starts is a task, what another system starts a service; what a person starts is a page when its file is web
 * markup or script or its part is a site, and a screen otherwise.
 * @param entry the entry point: its file, starter, part kind and layer
 * @param tooling the layers whose entry points are build or install scripts
 * @returns the kind
 */
const entryKindOf = (entry: Entry, tooling: ReadonlySet<string>): SurfaceKind => {
    if (entry.partKind === "tests") {
        return "test";
    }
    if (endsWithAny(entry.file, buildFiles)) {
        return "buildStep";
    }
    if (endsWithAny(entry.file, scriptFiles)) {
        return entry.partKind === "tool" || (entry.layer !== null && tooling.has(entry.layer))
            ? "buildStep"
            : "command";
    }
    if (entry.partKind === "tool") {
        return "command";
    }
    if (entry.startedBy === "schedule") {
        return "task";
    }
    if (entry.startedBy === "otherSystem") {
        return "service";
    }
    return endsWithAny(entry.file, webFiles) || pagePathOf(entry.file) !== undefined || entry.partKind === "site"
        ? "page"
        : "screen";
};

/**
 * The kind most of some kinds are; a tie goes to the kind the closed list names first.
 * @param kinds the kinds
 * @returns the kind
 */
const mostOf = (kinds: readonly SurfaceKind[]): SurfaceKind => {
    const times = new Map<SurfaceKind, number>();
    kinds.forEach((kind) => addToCount(times, kind, 1));
    const ranked = [...times].toSorted(
        ([one, many], [other, more]) => more - many || surfaceKinds.indexOf(one) - surfaceKinds.indexOf(other),
    );
    const [first] = ranked;
    return first === undefined ? "other" : first[0];
};

/**
 * A stored text as a kind of place, when it is one of the closed list.
 * @param text the text
 * @returns the kind, or none
 */
const asSurfaceKind = (text: string | null) => surfaceKinds.find((kind) => kind === text);

/**
 * The kind of place each code kind's entry points belong in: the code kind's own `surfaceKind` where the Map wrote it,
 * else the kind most of its entry points are by `entryKindOf`, so older analyses, whose code kinds state none, get one
 * by code.
 * @param entries every entry point
 * @param tooling the layers whose entry points are build or install scripts
 * @returns each code kind's kind, by record id, and whether the Map stated it
 */
const codeKindKindsOf = (entries: readonly Entry[], tooling: ReadonlySet<string>) => {
    const byKind = new Map<string, Entry[]>();
    entries.forEach((entry) => {
        if (entry.codeKind !== null) {
            getOrCreate(byKind, entry.codeKind).push(entry);
        }
    });
    return new Map(
        [...byKind].map(([codeKind, members]) => {
            const stated = members.map((each) => asSurfaceKind(each.surfaceKind)).find((kind) => kind !== undefined);
            return [
                codeKind,
                stated === undefined
                    ? { kind: mostOf(members.map((each) => entryKindOf(each, tooling))), stated: false }
                    : { kind: stated, stated: true },
            ] as const;
        }),
    );
};

export type Candidate = {
    readonly key: string;
    readonly kind: SurfaceKind;
    readonly name: string;
    readonly entries: readonly EntryRow[];
};

/**
 * The last part of a path, without its extension.
 * @param path the path
 * @returns its base name
 */
const baseNameOf = (path: string) => {
    const last = path.split("/").at(-1);
    const base = last === undefined ? path : last;
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(0, dot) : base;
};

/**
 * The candidate places, found by code from where every entry point lies, whoever starts it (a person, another system,
 * a schedule, a test runner or a build): a page's markup, code behind and browser script are one candidate, any other
 * file one of its own (`placeKeyOf`). Each has the kind most of its entry points are, and a name to fall back on: the
 * one class its entry points sit in, or its file's name.
 * @param entries every entry point
 * @param kindOf the kind of each entry point
 * @returns the candidates, by key
 */
const candidatesOf = (entries: readonly EntryRow[], kindOf: (entry: EntryRow) => SurfaceKind): Candidate[] => {
    const pages = unique(
        entries.flatMap((entry) => {
            const page = pagePathOf(entry.file);
            return page === undefined ? [] : [page];
        }),
    );
    const groups = new Map<string, EntryRow[]>();
    entries.forEach((entry) => getOrCreate(groups, placeKeyOf(entry.file, pages)).push(entry));
    return [...groups]
        .map(([key, members]) => {
            const containers = unique(members.flatMap((each) => (each.container === null ? [] : [each.container])));
            const [only] = containers;
            return {
                key,
                kind: mostOf(members.map(kindOf)),
                name: containers.length === 1 && only !== undefined ? only : baseNameOf(key),
                entries: members,
            };
        })
        .toSorted((one, other) => compareText(one.key, other.key));
};

type ScreenRecord = typeof ScreenRecordRow.Type;

type Surface = {
    readonly key: string;
    readonly name: string;
    readonly purpose: string;
    readonly kind: SurfaceKind;
    readonly unnamed: boolean;
    readonly places: readonly string[];
    readonly entries: readonly EntryRow[];
};

/**
 * The places of the system: each `Screen` record the briefing wrote over the candidates it names, and each candidate
 * no record names as a place of its own, named by code and marked unnamed (tests are never named; an analysis made
 * before the briefing named places has none named). A record judged `other` places nothing: its entry points are
 * unplaced, said, never dropped. A place's key is its first candidate's key, a path the code fixes, so it stays the same
 * when the briefing is run again.
 * @param candidates the candidates
 * @param records the places the briefing named
 * @returns the places, by key, and the entry points no place holds
 */
const surfacesOf = (candidates: readonly Candidate[], records: readonly ScreenRecord[]) => {
    const recordOf = new Map(records.flatMap((record) => record.places.map((place) => [place, record] as const)));
    const named = new Map<string, Candidate[]>();
    const surfaces: Surface[] = [];
    const unplaced: EntryRow[] = [];
    for (const candidate of candidates) {
        const record = recordOf.get(candidate.key);
        if (record === undefined) {
            surfaces.push({
                key: candidate.key,
                name: candidate.name,
                purpose: "",
                kind: candidate.kind,
                unnamed: true,
                places: [candidate.key],
                entries: candidate.entries,
            });
        } else if (record.kind === "other") {
            unplaced.push(...candidate.entries);
        } else {
            getOrCreate(named, record.id).push(candidate);
        }
    }
    for (const record of records) {
        const held = named.get(record.id);
        const [first] = held === undefined ? [] : held;
        if (held !== undefined && first !== undefined) {
            surfaces.push({
                key: first.key,
                name: record.name,
                purpose: record.purpose,
                kind: record.kind,
                unnamed: false,
                places: held.map((each) => each.key),
                entries: held.flatMap((each) => each.entries),
            });
        }
    }
    return { surfaces: surfaces.toSorted((one, other) => compareText(one.key, other.key)), unplaced };
};

/**
 * The gate on the places: every entry point in exactly one place, or unplaced and said.
 * @param entries every entry point's record id
 * @param model the places and the entry points none holds
 * @param model.surfaces the places
 * @param model.unplaced the entry points no place holds
 * @returns one line per gap
 */
export const surfaceGaps = (
    entries: readonly string[],
    model: {
        readonly surfaces: ReadonlyArray<{
            readonly key: string;
            readonly entries: ReadonlyArray<{ readonly id: string }>;
        }>;
        readonly unplaced: ReadonlyArray<{ readonly id: string }>;
    },
) => {
    const times = new Map<string, number>();
    model.surfaces.forEach((surface) => surface.entries.forEach((entry) => addToCount(times, entry.id, 1)));
    model.unplaced.forEach((entry) => addToCount(times, entry.id, 1));
    const known = new Set(entries);
    return [
        ...entries.flatMap((id) => {
            const count = times.get(id);
            return count === undefined
                ? [`entry point ${id} is in no place and not said to be unplaced`]
                : count > 1
                  ? [`entry point ${id} is in ${count} places`]
                  : [];
        }),
        ...[...times.keys()].filter((id) => !known.has(id)).map((id) => `a place holds ${id}, which is no entry point`),
    ];
};

/**
 * Every entry point with what a place is made from: who starts it, how it is reached, its file and lines, its code
 * kind (and the place kind the Map gave it), its layer, the kind of part it lies in and its capability.
 * @param store the record store, read only
 * @returns the entry points, by file and first line
 */
const readEntries = (store: RecordStore["Service"]) =>
    read(
        store,
        EntryRow,
        (sql) => sql`SELECT b.id AS id, json_extract(b.body, '$.writtenAs') AS name,
                json_extract(b.body, '$.container') AS container,
                coalesce(json_extract(b.body, '$.entryPoint.startedBy'), 'otherSystem') AS startedBy,
                json_extract(b.body, '$.entryPoint.reachedBy') AS reachedBy,
                json_extract(b.body, '$.entryPoint.purpose') AS purpose,
                json_extract(b.body, '$.entryPoint.evidence') AS evidence,
                f.path AS file, b.firstLine AS firstLine, b.lastLine AS lastLine,
                k.id AS codeKind, json_extract(k.body, '$.surfaceKind') AS surfaceKind, l.id AS layer,
                json_extract(p.body, '$.kind') AS partKind, ec.capability AS capability
            FROM entryPoint ep JOIN record b ON b.recordNumber = ep.recordNumber
            JOIN file f ON f.fileNumber = b.fileNumber
            LEFT JOIN ref rk ON rk.fromRecord = b.recordNumber AND rk.role = 'codeKind'
            LEFT JOIN record k ON k.recordNumber = rk.toRecord
            LEFT JOIN ref rl ON rl.fromRecord = k.recordNumber AND rl.role = 'layer'
            LEFT JOIN record l ON l.recordNumber = rl.toRecord
            LEFT JOIN filePart fp ON fp.fileNumber = f.fileNumber LEFT JOIN record p ON p.recordNumber = fp.part
            LEFT JOIN v_entry_point_capability ec ON ec.entryPoint = b.id
            ORDER BY f.path, b.firstLine, b.id`,
    );

/**
 * The places of the system read from the store: every entry point, its kind (a test in a tests part, else its code
 * kind's, stated or derived), the
 * candidates code finds, the places the briefing named over them and the rest named by code, each entry point's key
 * and place, and the nouns a reader is given for each kind.
 * @param store the record store, read only
 * @param catalogue the catalogue, for the nouns
 * @returns the model of the places
 */
export const readSurfaceModel = Effect.fnUntraced(function* (store: RecordStore["Service"], catalogue: Catalogue) {
    const entries = yield* readEntries(store);
    const tooling = new Set(
        (yield* layerRoles(store)).filter((role) => role.role === "runsAsTooling").map((role) => role.layer),
    );
    const records = yield* read(
        store,
        ScreenRecordRow,
        (sql) => sql`SELECT id, json_extract(body, '$.name') AS name, json_extract(body, '$.purpose') AS purpose,
                json_extract(body, '$.kind') AS kind, json_extract(body, '$.places') AS places
            FROM record WHERE type = 'Screen' ORDER BY recordNumber`,
    );
    const codeKinds = codeKindKindsOf(entries, tooling);
    const kindOf = (entry: EntryRow): SurfaceKind => {
        if (entry.partKind === "tests") {
            return "test";
        }
        const stated = entry.codeKind === null ? undefined : codeKinds.get(entry.codeKind);
        return stated === undefined ? entryKindOf(entry, tooling) : stated.kind;
    };
    const candidates = candidatesOf(entries, kindOf);
    const { surfaces, unplaced } = surfacesOf(candidates, records);
    const surfaceOf = new Map(
        surfaces.flatMap((surface) => surface.entries.map((entry) => [entry.id, surface] as const)),
    );
    const nouns = new Map(catalogue.surfaceKinds.map((kind) => [kind.id, { one: kind.one, many: kind.many }] as const));
    return {
        entries,
        candidates,
        surfaces,
        unplaced,
        surfaceOf,
        kindOf,
        keys: entryKeysOf(entries),
        nounOf: (kind: SurfaceKind) => {
            const noun = nouns.get(kind);
            return noun === undefined ? { one: kind, many: kind } : noun;
        },
        codeKindsStated: [...codeKinds.values()].filter((each) => each.stated).length,
    };
});

export type SurfaceModel = Effect.Success<ReturnType<typeof readSurfaceModel>>;
