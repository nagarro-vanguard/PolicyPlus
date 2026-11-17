import { Effect, Stream } from "effect";
import { FileAccess } from "../../shared/source/file-access";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { RecordReads } from "../../shared/read/record-reads";
import { everySubject, readBriefParts, staleBriefGap } from "../../shared/store/stage-brief";
import { partOf, technologyCovering } from "../../shared/source/scope-counts";
import type { Lines } from "../../shared/model/shared-fields";
import { askedOf, readCatalogue } from "../../shared/run/catalogue";
import { Fact } from "../../shared/model/schemas/fact";
import { SystemPart } from "../../shared/model/schemas/system-part";
import { Technology } from "../../shared/model/schemas/technology";

/**
 * A brief of the Map's: the parts, each with its kind and folders; the technologies, each with its kind and what it
 * does; and the facts whose questions the Map reads (`readBriefParts`) about the subjects it keeps, How it runs' notes
 * on each technology among them. The Map's own registries are given apart, as `registryPath`, since the Map writes
 * them.
 * @param keeps whether a fact about a subject is carried
 * @returns the brief, as its text
 */
const briefText = Effect.fnUntraced(function* (keeps: (subject: (typeof Fact.Type)["subject"]) => boolean) {
    const { preparedFrom, facts } = yield* readBriefParts("map", ["inventory", "how-it-runs"], keeps);
    const reads = yield* RecordReads;
    const parts = yield* Stream.runCollect(reads.recordsOfType("SystemPart", SystemPart));
    const technologies = yield* Stream.runCollect(reads.recordsOfType("Technology", Technology));
    const brief = {
        preparedFrom,
        parts: parts.map((part) => ({ id: part.id, name: part.name, kind: part.kind, folders: part.folders })),
        technologies: technologies.map((technology) => ({
            id: technology.id,
            kind: technology.kind,
            name: technology.name,
            ...(technology.purpose === undefined ? {} : { purpose: technology.purpose }),
        })),
        facts,
    };
    return JSON.stringify(brief, null, 1);
});

/**
 * The stage's brief, every fact the Map reads: what the proposing jobs and their reviews work from, and what tells the
 * Map's jobs stale when an earlier stage writes again.
 * @returns the brief, as its text
 */
export const mapBriefText = () => briefText(everySubject);

/**
 * One Map job's brief (plan 0006, decision A): the stage's brief cut to what its windows touch, the parts holding its
 * files, the technologies those parts use or that cover its files (languages and kinds of file that are not code), and
 * the system. A job in code no part holds keeps its files' technologies and the system. It opens with the rules for
 * where a block starts and ends, so the agent works from one document. Its agent and its review read it; every part and
 * technology is still named, so nothing it meets is unknown by name.
 * @param root the analysis root
 * @param windows the job's windows
 * @returns the brief, as its text
 */
export const mapJobBriefText = Effect.fnUntraced(function* (root: string, windows: readonly Lines[]) {
    const reads = yield* RecordReads;
    const technologies = yield* Stream.runCollect(reads.recordsOfType("Technology", Technology));
    const find = partOf(yield* Stream.runCollect(reads.recordsOfType("SystemPart", SystemPart)));
    const cover = technologyCovering(technologies, ["language", "notCode"]);
    const held = new Set<string>();
    for (const window of windows) {
        const part = find(window.file);
        const covering = cover(window.file);
        if (part !== undefined) {
            held.add(part.id);
        }
        if (covering !== undefined) {
            held.add(covering.id);
        }
    }
    for (const technology of technologies) {
        if (technology.uses.some((use) => use.parts.some((part) => held.has(part)))) {
            held.add(technology.id);
        }
    }
    const rules = yield* (yield* FileAccess).readText(analysisPaths(root).blocksAndContainers);
    return `${rules.trimEnd()}\n\n## The facts on what your windows touch\n\n${yield* briefText((subject) => subject === "system" || held.has(subject.key))}`;
});

/**
 * Refuse while the brief built today differs from the one the Map's jobs were prepared with: Inventory or How it runs
 * wrote again since, so the jobs would finish on a scope or rules that no longer hold.
 * @param root the analysis root
 * @returns nothing when the brief is current; the gap otherwise
 */
export const staleMapBrief = Effect.fnUntraced(function* (root: string) {
    return yield* staleBriefGap(analysisPaths(root).mapBrief, yield* mapBriefText(), {
        name: "the Map",
        prepare: "map-codebase.ts prepare",
    });
});

/**
 * The rules the Map reads that How it runs has not got (plan 0005, decision F): for each technology How it runs wrote a
 * fact about, each question the Map reads of technologies with no answer standing; printed by `prepare` so the person sees what the Map's jobs will work without.
 * @returns one line per technology and question, its name and the question's words
 */
export const rulesNotGot = Effect.fnUntraced(function* () {
    const catalogue = yield* readCatalogue();
    const reads = yield* RecordReads;
    const facts = yield* Stream.runCollect(reads.recordsOfType("Fact", Fact, ["how-it-runs"]));
    const technologies = yield* Stream.runCollect(reads.recordsOfType("Technology", Technology));
    const questions = catalogue.aspects.filter(
        (aspect) => aspect.readers.includes("map") && askedOf(aspect, "technologies"),
    );
    const about = (fact: (typeof facts)[number], id: string) =>
        fact.subject !== "system" && fact.subject.registry === "technologies" && fact.subject.key === id;
    return technologies
        .filter((technology) => facts.some((fact) => about(fact, technology.id)))
        .flatMap((technology) =>
            questions
                .filter(
                    (question) =>
                        !facts.some(
                            (fact) =>
                                about(fact, technology.id) && fact.aspect === question.id && fact.risk === undefined,
                        ),
                )
                .map((question) => `${technology.name}: ${question.words}`),
        );
});
