import { Effect, Stream } from "effect";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { askedOf, readCatalogue, type Catalogue } from "../../shared/run/catalogue";
import { compareText } from "../../shared/run/collections";
import { topicKey } from "../../shared/jobs/conclusions";
import { RecordReads } from "../../shared/read/record-reads";
import { ScopeFiles } from "../../shared/read/scope-files";
import { requireAcceptedRecords } from "../../shared/store/stage-guards";
import { partOf } from "../../shared/source/scope-counts";
import { sha1Hex } from "../../shared/run/hashing-and-random";
import { DocumentInvalid } from "../../shared/run/script-errors";
import type { Fact } from "../../shared/model/schemas/fact";
import { SystemPart } from "../../shared/model/schemas/system-part";
import { Technology } from "../../shared/model/schemas/technology";
import { areasOf, linesOf, type FileArea, type Listed } from "./study-areas";

type Part = typeof SystemPart.Type;

type Topic = { readonly subject: (typeof Fact.Type)["subject"]; readonly aspect: string };

export type Job = {
    readonly name: string;
    readonly kind: "technology" | "parts" | "area";
    readonly technology: (typeof Technology.Type)["id"] | undefined;
    readonly parts: ReadonlyArray<Part["id"]>;
    readonly topics: readonly Topic[];
    readonly area: FileArea | undefined;
    readonly held: readonly Listed[];
};

type Budgets = { readonly lines: number; readonly topics: number };

type Sized = { readonly part: Part; readonly files: readonly Listed[]; readonly topics: readonly Topic[] };

/**
 * The questions How it runs answers of one subject (plan 0003, H1): every question answered by facts, or by findings
 * only (plan 0004), and asked of it,
 * a part's by its kind.
 * @param catalogue the catalogue
 * @param subject the subject
 * @param partKind a part's kind
 * @returns the subject's topics
 */
const topicsOf = (catalogue: Catalogue, subject: Exclude<Topic["subject"], "system">, partKind?: string): Topic[] =>
    catalogue.aspects
        .filter(
            (aspect) =>
                (aspect.answeredBy === "facts" || aspect.answeredBy === "findings") &&
                askedOf(aspect, subject.registry, partKind),
        )
        .map((aspect) => ({ subject, aspect: aspect.id }));

/**
 * The parts within L packed whole into jobs of at most L lines and T topics, in folder order, so neighbours share a
 * job; each job named by its first part and how many more it holds.
 * @param parts the parts within L, each with its files and topics
 * @param budgets L and T
 * @returns the jobs
 */
function packed(parts: readonly Sized[], budgets: Budgets): Job[] {
    const groups: Sized[][] = [];
    let lines = 0;
    let topics = 0;
    for (const part of parts.filter((each) => each.topics.length > 0)) {
        const size = linesOf(part.files);
        const last = groups.at(-1);
        if (last === undefined || lines + size > budgets.lines || topics + part.topics.length > budgets.topics) {
            groups.push([part]);
            lines = size;
            topics = part.topics.length;
        } else {
            last.push(part);
            lines += size;
            topics += part.topics.length;
        }
    }
    return groups.map((group) => {
        const names = group.map((each) => each.part.name);
        return {
            name: names.length > 1 ? `${names[0]} and ${names.length - 1} more` : names.join(""),
            kind: "parts",
            technology: undefined,
            parts: group.map((each) => each.part.id),
            topics: group.flatMap((each) => each.topics),
            area: undefined,
            held: group.flatMap((each) => each.files),
        };
    });
}

/**
 * A part over L cut into areas along its folders (H1, D7), each a job that writes notes on every question of the
 * part; the concluding step reduces them to one answer per topic.
 * @param part the part, with its files and topics
 * @param budget L
 * @returns the jobs, one per area
 */
function sharded(part: Sized, budget: number): Job[] {
    const areas = areasOf(part.files, budget);
    return areas.map((area, i) => ({
        name: `${part.part.name} (area ${i + 1} of ${areas.length})`,
        kind: "area",
        technology: undefined,
        parts: [part.part.id],
        topics: part.topics,
        area,
        held: area.held,
    }));
}

/**
 * The gaps of a cut against what it must hold (A4 of the architecture, H2): every topic listed is assigned once, a
 * sharded part's to its areas together; every file of a part is in exactly one job; every job is within L and T, but
 * a part over T alone or a file over L alone. A gap is a defect in the cut, never in what Inventory wrote.
 * @param jobs the jobs
 * @param topics every topic listed
 * @param parts every part with its files and topics
 * @param budgets L and T
 * @returns one line per gap
 */
function cutGaps(jobs: readonly Job[], topics: readonly Topic[], parts: readonly Sized[], budgets: Budgets): string[] {
    const owners = new Map<string, number>(topics.map((topic) => [topicKey(topic.subject, topic.aspect), 0]));
    const holders = new Map<string, number>(parts.flatMap((part) => part.files.map((file) => [file.path, 0])));
    const counted = new Set<string>();
    const strays: string[] = [];
    for (const [index, job] of jobs.entries()) {
        const owner = job.kind === "area" ? `area of ${job.parts.join("")}` : `job ${index}`;
        for (const topic of counted.has(owner) ? [] : job.topics) {
            const key = topicKey(topic.subject, topic.aspect);
            const held = owners.get(key);
            if (held === undefined) {
                strays.push(`${job.name} is given a topic no part or technology asks: ${topic.aspect}`);
            } else {
                owners.set(key, held + 1);
            }
        }
        counted.add(owner);
        for (const file of job.held) {
            const held = holders.get(file.path);
            if (held === undefined) {
                strays.push(`${job.name} holds ${file.path}, which is no part's`);
            } else {
                holders.set(file.path, held + 1);
            }
        }
    }
    return [
        ...strays,
        ...[...owners].filter(([, count]) => count !== 1).map(([key, count]) => `${key} has ${count} owners`),
        ...[...holders].filter(([, count]) => count !== 1).map(([path, count]) => `${path} is in ${count} jobs`),
        ...jobs
            .filter((job) => job.held.length > 1 && linesOf(job.held) > budgets.lines)
            .map((job) => `${job.name} holds ${linesOf(job.held)} lines, over ${budgets.lines}`),
        ...jobs
            .filter((job) => job.kind === "parts" && job.parts.length > 1 && job.topics.length > budgets.topics)
            .map((job) => `${job.name} answers ${job.topics.length} topics, over ${budgets.topics}`),
    ];
}

/**
 * How it runs' jobs (H1): one per framework and platform, answering the questions asked of the technology; the parts
 * within L packed; each part over L in areas. Refused: any gap of the cut (`cutGaps`).
 * @param catalogue the catalogue
 * @param stack the technologies
 * @param parts the parts, each with its files in scope, in folder order
 * @param budgets L and T
 * @returns the jobs; DocumentInvalid naming each problem
 */
function jobsOf(
    catalogue: Catalogue,
    stack: ReadonlyArray<typeof Technology.Type>,
    parts: ReadonlyArray<{ readonly part: Part; readonly files: readonly Listed[] }>,
    budgets: Budgets,
) {
    const studied = [
        ...stack.filter((entry) => entry.kind === "framework"),
        ...stack.filter((entry) => entry.kind === "platform"),
    ];
    const technologies: Job[] = studied.map((entry) => ({
        name: entry.name,
        kind: "technology",
        technology: entry.id,
        parts: [...new Set(entry.uses.flatMap((use) => use.parts))],
        topics: topicsOf(catalogue, { registry: "technologies", key: entry.id }),
        area: undefined,
        held: [],
    }));
    const sized = parts.map((each) => ({
        ...each,
        topics: topicsOf(catalogue, { registry: "parts", key: each.part.id }, each.part.kind),
    }));
    const jobs = [
        ...technologies,
        ...packed(
            sized.filter((each) => linesOf(each.files) <= budgets.lines),
            budgets,
        ),
        ...sized.filter((each) => linesOf(each.files) > budgets.lines).flatMap((each) => sharded(each, budgets.lines)),
    ];
    const problems = cutGaps(
        jobs,
        [...technologies, ...sized].flatMap((each) => each.topics),
        sized,
        budgets,
    ).map((gap) => `the cut is unsound, a defect in the skill: ${gap}`);
    return problems.length
        ? Effect.fail(
              new DocumentInvalid({
                  path: "the parts and technologies Inventory accepted",
                  issue: problems.join("; "),
              }),
          )
        : Effect.succeed(jobs);
}

/**
 * The technologies and parts Inventory accepted, and How it runs' jobs from them. Inventory must have finished:
 * without its parts and manifest there is nothing to study and nothing a study may cite.
 * @returns the technologies, the parts and the jobs; UsageInvalid until Inventory has accepted its records
 */
export const readStack = Effect.fnUntraced(function* () {
    yield* requireAcceptedRecords("inventory");
    const reads = yield* RecordReads;
    const entries = yield* Stream.runCollect(reads.recordsOfType("Technology", Technology));
    const parts = yield* Stream.runCollect(reads.recordsOfType("SystemPart", SystemPart));
    const read = yield* Stream.runCollect((yield* ScopeFiles).manifestRows);
    const find = partOf(parts);
    const filesOf = new Map<string, Listed[]>(parts.map((part) => [part.id, []]));
    for (const file of read.filter((each) => each.copyOf === undefined)) {
        const part = find(file.path);
        const held = part === undefined ? undefined : filesOf.get(part.id);
        if (held !== undefined) {
            held.push({ path: file.path, lines: file.lines });
        }
    }
    const ordered = parts
        .toSorted((one, other) => compareText(one.folders[0], other.folders[0]))
        .map((part) => {
            const files = filesOf.get(part.id);
            return { part, files: files === undefined ? [] : files };
        });
    const { studyLinesBudget, topicsPerJob } = yield* AnalysisConfig;
    const budgets = { lines: studyLinesBudget, topics: topicsPerJob };
    return { entries, parts, jobs: yield* jobsOf(yield* readCatalogue(), entries, ordered, budgets) };
});

/**
 * A job's definition, as `prepare` records it (2A): its kind, subjects (by record id), topics, area and the files it
 * holds, never a name. A
 * job whose definition is unchanged keeps its work; any change at Inventory that reaches it makes it a new job.
 * @param job the job
 * @returns the definition's hash
 */
export const definitionOf = (job: Job) =>
    sha1Hex(
        JSON.stringify([
            job.kind,
            job.technology,
            job.parts,
            job.topics,
            job.area === undefined ? [] : [job.area.folders, job.area.files],
            job.held.map((file) => file.path),
        ]),
    );
