import { Effect, Schema, Stream } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { AnyRecord, readDocumentStrictly, readRecords, writeJsonl } from "../../shared/run/json-files";
import { askedOf, readCatalogue } from "../../shared/run/catalogue";
import { getOrCreate } from "../../shared/run/collections";
import { holds } from "../../shared/model/line-ranges";
import { readAgentOutput } from "../../shared/read/record-reading";
import { RecordReads } from "../../shared/read/record-reads";
import { checkAndIssueRecordIds } from "../../shared/read/record-writing";
import { partOf } from "../../shared/source/scope-counts";
import { SystemPart } from "../../shared/model/schemas/system-part";
import type { Lines } from "../../shared/model/shared-fields";
import { mapShapes } from "./check-map";
import { mapJobFiles } from "./map-jobs";
import { outcomeOf, readAcceptedRegistries, type MapRegistriesState } from "./map-registries";

const said = {
    connections: {
        aspect: "connections",
        why: "These calls are pointed at their target while the system runs, from settings or data no file in scope holds.",
        confirmWith: "runningSystem",
        ifWrong:
            "The flows through these calls go on into code the account does not follow, so what each entry point reaches, and the data it changes, may be more than is shown.",
    },
} as const;

const IssuedIds = Schema.Array(Schema.Tuple([Schema.String, Schema.String]));

type Place = { readonly lines: Lines; readonly shows: string };

/**
 * The calls whose target the code does not show, in the accepted jobs' outputs read one at a time, each grouped by the
 * code kind of the block making it (the innermost block holding its lines), or by none when no block of its job
 * holds it.
 * @param root the analysis root
 * @param jobIds the Map's jobs
 * @returns the places, by the calling block's code kind (an empty key for none)
 */
const unseenTargets = Effect.fnUntraced(function* (root: string, jobIds: readonly string[]) {
    const byBlock = new Map<string, Place[]>();
    for (const jobId of jobIds) {
        const files = mapJobFiles(root, jobId);
        const outcome = yield* outcomeOf(jobId);
        if (outcome !== "accepted") {
            continue;
        }
        const output = yield* readAgentOutput(files.outputPath, mapShapes);
        const blocks = output.of("Block");
        for (const link of output.of("Link")) {
            if (link.unresolvedTarget === undefined) {
                continue;
            }
            const [calling] = blocks
                .filter((block) => holds(block.lines, link.lines))
                .sort(
                    (one, other) =>
                        one.lines.lastLine - one.lines.firstLine - (other.lines.lastLine - other.lines.firstLine),
                );
            const kind = calling === undefined ? "" : calling.codeKind;
            getOrCreate(byBlock, kind).push({ lines: link.lines, shows: link.unresolvedTarget });
        }
    }
    return byBlock;
});

/**
 * One assumption per subject, its places grouped by the part holding each (or the system for code no part holds, or a
 * part its question is not asked of).
 * @param places the places
 * @param subjectOf the subject a place's lines belong to under this question
 * @param fact the assumption's words, its places given
 * @returns the facts, unissued
 */
function perSubject(
    places: readonly Place[],
    subjectOf: (lines: Lines) => string,
    fact: (subject: string, places: readonly Place[]) => Record<string, unknown>,
) {
    const bySubject = new Map<string, Place[]>();
    places.forEach((place) => getOrCreate(bySubject, subjectOf(place.lines)).push(place));
    return [...bySubject].map(([subject, held]) => fact(subject, held));
}

/**
 * The assumptions the Map writes for what it cannot see (D165, plan 0006, decision D), once per part and kind, each
 * place carrying its own words, never a question to the person: for each part, one per code kind of the calling
 * code for calls whose target the code does not show (`connections`). A part its question is not asked of, and code no
 * part holds, give the system's. Code of a kind no entry names is no assumption: its job writes the entry (P1.38).
 * Each keeps the record id it was first issued, by its subject, question and the code kind of the calling code (all
 * record ids), from the Map's own files under `work/`, which this rewrites: the store is rebuilt from `work/` (I8), and a rebuilt store holds the same
 * records, so a later stage's brief stays current (D230).
 * @param root the analysis root
 * @param state where the loop stands
 * @returns the facts, each issued its record id
 */
export const mapAssumptions = Effect.fnUntraced(function* (root: string, state: MapRegistriesState) {
    const catalogue = yield* readCatalogue();
    const find = partOf(yield* Stream.runCollect((yield* RecordReads).recordsOfType("SystemPart", SystemPart)));
    const subjectFor = (aspectId: string) => (lines: Lines) => {
        const aspect = catalogue.aspects.find((each) => each.id === aspectId);
        const part = find(lines.file);
        return part !== undefined && aspect !== undefined && askedOf(aspect, "parts", part.kind) ? part.id : "system";
    };
    const assumed =
        (
            aspect: string,
            statement: string,
            words: { readonly why: string; readonly confirmWith: string; readonly ifWrong: string },
        ) =>
        (subject: string, places: readonly Place[]) => ({
            subject: subject === "system" ? "system" : { registry: "parts", key: subject },
            aspect,
            statement,
            basis: {
                assumed: { why: words.why, confirmWith: words.confirmWith, ifWrong: words.ifWrong, evidence: places },
            },
        });
    const facts: Array<{ readonly key: string; readonly fact: Record<string, unknown> }> = [];
    const named = new Map<string, string>(
        (yield* readAcceptedRegistries(root)).codeKinds.map((entry) => [entry.id, entry.name]),
    );
    for (const [kind, places] of yield* unseenTargets(root, state.order)) {
        const from = named.get(kind);
        const statement = `Some calls ${from === undefined ? "in this code" : `in its ${from} code`} are pointed at their target while the system runs, so the code does not show where they go.`;
        const words = said.connections;
        const made = perSubject(places, subjectFor(words.aspect), assumed(words.aspect, statement, words));
        facts.push(...made.map((fact) => ({ key: JSON.stringify([fact.subject, fact.aspect, kind]), fact })));
    }
    const path = analysisPaths(root).mapAssumptions;
    const before = (yield* (yield* FileAccess).exists(path)) ? yield* readRecords(path, AnyRecord) : [];
    const idsPath = analysisPaths(root).mapAssumptionIds;
    const issuedTo = new Map<string, string>(
        (yield* (yield* FileAccess).exists(idsPath)) ? yield* readDocumentStrictly(idsPath, IssuedIds) : [],
    );
    const kept = facts.map(({ key, fact }) => {
        const id = issuedTo.get(key);
        return id === undefined ? fact : { id, ...fact };
    });
    const issued = yield* checkAndIssueRecordIds("Fact", kept, before);
    yield* writeJsonl(path, issued);
    yield* (yield* FileAccess).writeText(
        idsPath,
        JSON.stringify(facts.flatMap(({ key }, i) => issued.slice(i, i + 1).map((each) => [key, each.id] as const))),
    );
    return issued;
});
