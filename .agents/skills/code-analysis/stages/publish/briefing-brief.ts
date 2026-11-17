import { Effect, Schema, Stream } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { jsonlText, readRecords } from "../../shared/run/json-files";
import { readCapabilityView } from "../../shared/run/capability-view";
import { getOrCreate, unique } from "../../shared/run/collections";
import { RecordReads } from "../../shared/read/record-reads";
import { ScopeFiles } from "../../shared/read/scope-files";
import { partOf } from "../../shared/source/scope-counts";
import { SystemPart } from "../../shared/model/schemas/system-part";
import { externalSystemKinds } from "../../shared/model/record-words";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { Technology } from "../../shared/model/schemas/technology";
import { BlockId, CapabilityId, Text, about } from "../../shared/model/shared-fields";
import { RecordStore } from "../../shared/store/database";
import { decodedRows } from "../../shared/store/stored-bodies";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const Words = Schema.Array(Text);

const BriefSystem = Schema.Struct({
    line: Schema.Literal("system"),
    builtWith: Words.annotate(about("Its languages and frameworks.")),
    files: Count,
    lines: Count,
    externalSystems: Words.annotate(about("Every external system it talks to, with its kind.")),
}).annotate(about("The system as a whole: the brief's first line."));

const BriefCapability = Schema.Struct({
    line: Schema.Literal("capability"),
    capability: CapabilityId,
    name: Text,
    summary: Text,
    startedBy: Schema.Struct({ person: Count, schedule: Count, otherSystem: Count }).annotate(
        about("How many of its entry points are started by a person, a schedule and another system."),
    ),
    entryPoints: Words.annotate(about("What its first five entry points do, as the Map wrote it.")),
    parts: Words.annotate(about("The parts of the system its entry points sit in.")),
    keeps: Words.annotate(about("The kinds of data it uses, each with how: saves, reads or both.")),
    talksTo: Words.annotate(about("The external systems its work reaches.")),
    sharesWith: Schema.Array(CapabilityId).annotate(
        about("The capabilities that save or read a kind of data it does."),
    ),
}).annotate(about("One capability holding an entry point, as an area is chosen from: each has one line."));

const BriefCandidate = Schema.Struct({
    line: Schema.Literal("candidate"),
    block: BlockId.annotate(about("The block's record id.")),
    name: Text.annotate(about("Its class or module and its name, as the code writes them.")),
    where: Text.annotate(about("Its file and first line.")),
    capabilities: Count.annotate(about("How many capabilities' entry points reach it.")),
    callerLayers: Count.annotate(about("From how many layers it is called.")),
    callers: Count.annotate(about("How many blocks call it.")),
}).annotate(
    about(
        "One block that many capabilities share and that is called from more than one layer, found by rule: a cross-cutting mechanism or shared business code, for the briefing to name and judge.",
    ),
);

const BriefLine = Schema.Union([BriefSystem, BriefCapability, BriefCandidate]);

const CandidateRow = Schema.Struct({
    block: Schema.String,
    name: Schema.NullOr(Schema.String),
    container: Schema.NullOr(Schema.String),
    file: Schema.String,
    firstLine: Schema.Number,
    capabilities: Count,
    callerLayers: Count,
    callers: Count,
});

/**
 * The candidates for cross-cutting concerns, from the view that finds them by rule: blocks reached by a third of the
 * capabilities and called from more than one layer, the widest first.
 * @returns the lines
 */
const candidateLines = Effect.fnUntraced(function* () {
    const store = yield* RecordStore;
    const rows = yield* Effect.orDie(
        store.query((sql) =>
            decodedRows(CandidateRow)(
                sql`SELECT block, name, container, file, firstLine, capabilities, callerLayers, callers
                    FROM v_crosscut_candidate ORDER BY capabilities DESC, file, firstLine`,
            ),
        ),
    );
    return rows.map((row): typeof BriefCandidate.Encoded => ({
        line: "candidate",
        block: row.block,
        name: [row.container, row.name].filter((part) => part !== null).join(".") || "(unnamed)",
        where: `${row.file}:${row.firstLine}`,
        capabilities: row.capabilities,
        callerLayers: row.callerLayers,
        callers: row.callers,
    }));
});

const entryPointsBriefed = 5;

/**
 * The briefing's brief (D225): the system's line (what it is built with, its size, the external systems it reaches),
 * then one line per capability holding an entry point, from the capability view every page reads (P1.34): who starts its
 * entry points, what its first five do, its parts, the kinds of data it keeps, the external systems it reaches, and the
 * capabilities sharing a kind of data with it, through the entity index. A capability holding no entry point is not
 * briefed: the system page discloses it. Bounded by the capabilities and kinds of data, never by the code.
 * @param root the analysis root
 * @returns the lines
 */
const briefLines = Effect.fnUntraced(function* (root: string) {
    const reads = yield* RecordReads;
    const view = yield* readCapabilityView(root);
    const systems = yield* Stream.runCollect(reads.recordsOfType("ExternalSystem", ExternalSystem));
    const named = (yield* Stream.runCollect(reads.recordsOfType("Technology", Technology))).filter(
        (entry) => entry.kind === "framework" || entry.kind === "language",
    );
    const partHolding = partOf(yield* Stream.runCollect(reads.recordsOfType("SystemPart", SystemPart)));
    const totals = yield* (yield* ScopeFiles).scopeTotals;
    const usersOf = new Map<string, string[]>();
    for (const shown of view === undefined ? [] : view.capabilities) {
        shown.entities.forEach((use) => getOrCreate(usersOf, use.entity.id).push(shown.capability.id));
    }
    const capabilities = (view === undefined ? [] : view.capabilities)
        .filter((shown) => shown.entryPoints.length > 0)
        .map((shown): typeof BriefCapability.Encoded => ({
            line: "capability",
            capability: shown.capability.id,
            name: shown.capability.name,
            summary: shown.capability.purpose,
            startedBy: shown.startedBy,
            entryPoints: shown.entryPoints.slice(0, entryPointsBriefed).map((entryPoint) => entryPoint.purpose),
            parts: unique(
                shown.entryPoints.flatMap((entryPoint) => {
                    const part = partHolding(entryPoint.lines.file);
                    return part === undefined ? [] : [part.name];
                }),
            ),
            keeps: shown.entities.map((use) => `${use.entity.name} (${use.kinds.join(" and ")})`),
            talksTo: [...shown.talksTo],
            sharesWith: unique(
                shown.entities.flatMap((use) => {
                    const users = usersOf.get(use.entity.id);
                    return (users === undefined ? [] : users).filter((id) => id !== shown.capability.id);
                }),
            ),
        }));
    const system: typeof BriefSystem.Encoded = {
        line: "system",
        builtWith: named.map((entry) => entry.name),
        files: totals.files,
        lines: totals.lines,
        externalSystems: systems.map((each) => `${each.name}, ${externalSystemKinds[each.kind]}`),
    };
    return [system, ...capabilities, ...(yield* candidateLines())];
});

/**
 * Write the briefing's brief (`briefLines`), as its agent and reviewer read it.
 * @param root the analysis root
 * @returns nothing once written
 */
export const writeBriefingBrief = Effect.fnUntraced(function* (root: string) {
    yield* (yield* FileAccess).writeText(analysisPaths(root).briefingBrief, jsonlText(yield* briefLines(root)));
});

/**
 * The briefing's brief as written; none before `prepare` writes it.
 * @param root the analysis root
 * @returns the lines
 */
const readBriefLines = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).briefingBrief;
    return (yield* (yield* FileAccess).exists(path)) ? yield* readRecords(path, BriefLine) : [];
});

/**
 * The capabilities the briefing must place in areas, as the brief lists them.
 * @param root the analysis root
 * @returns the capabilities' record ids
 */
export const briefedCapabilities = Effect.fnUntraced(function* (root: string) {
    return (yield* readBriefLines(root)).flatMap((line) => (line.line === "capability" ? [line.capability] : []));
});

/**
 * The candidate blocks the briefing must explain, as the brief lists them.
 * @param root the analysis root
 * @returns the blocks' record ids
 */
export const briefedCandidates = Effect.fnUntraced(function* (root: string) {
    return (yield* readBriefLines(root)).flatMap((line) => (line.line === "candidate" ? [line.block] : []));
});
