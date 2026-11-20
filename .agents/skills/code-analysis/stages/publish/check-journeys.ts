import { Effect } from "effect";
import type { JsonRecord } from "../../shared/model/json-record";
import { Journey, JourneyMerge } from "../../shared/model/schemas/journeys";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { leaksIn, wordsIn } from "../../shared/jobs/journey-words";
import { checkReviewedJob, type ReviewedJob } from "../../shared/jobs/review-rounds";
import { missedOutside } from "../../shared/jobs/review-verdicts";
import type { Missed } from "../../shared/model/schemas/missed";
import { addToCount } from "../../shared/run/collections";
import { ofType } from "../../shared/read/record-reading";
import { citedFiles } from "../../shared/read/record-writing";
import { ScopeFiles } from "../../shared/read/scope-files";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { type JourneyJob, type MergeBrief, type TasksBrief, readJourneyBrief } from "./journeys-brief";

type Finding = JsonRecord & { readonly id: string };

/**
 * Whether a name is kebab-case: lower-case letters and digits in words joined by single hyphens.
 * @param name the name
 * @returns true for kebab-case
 */
const isKebab = (name: string) =>
    name
        .split("-")
        .every(
            (word) =>
                word !== "" && [...word].every((char) => (char >= "a" && char <= "z") || (char >= "0" && char <= "9")),
        );

/**
 * Each of some ids named exactly once by the lists that name them, and none named that are not wanted.
 * @param wanted the ids that must each be named once
 * @param lists the ids each task names
 * @param words what a gap calls them, in the plural and the singular
 * @param words.many the plural of what the ids are
 * @param words.one the singular
 * @returns one line per gap
 */
const onceEach = (
    wanted: readonly string[],
    lists: ReadonlyArray<readonly string[]>,
    words: { readonly many: string; readonly one: string },
): string[] => {
    const times = new Map<string, number>();
    lists.forEach((list) => list.forEach((id) => addToCount(times, id, 1)));
    const known = new Set(wanted);
    const lost = wanted.filter((id) => !times.has(id));
    const more = lost.length > 6 ? `, and ${lost.length - 6} more` : "";
    return [
        ...(lost.length > 0
            ? [`${lost.length} ${words.many} belong to no task: ${lost.slice(0, 6).join(", ")}${more}`]
            : []),
        ...[...times]
            .filter(([id, count]) => known.has(id) && count > 1)
            .map(([id, count]) => `${id} is in ${count} tasks: put each of the ${words.many} in exactly one`),
        ...[...times.keys()].filter((id) => !known.has(id)).map((id) => `${id} is no ${words.one} of the brief`),
    ];
};

/**
 * The gaps of one task: its name, its capability, its steps citing only its own entry points and every one of them
 * cited, its kinds of data and outside systems from the brief, and its words.
 * @param journey the task
 * @param brief what the job was given
 * @returns one line per gap
 */
const taskGaps = (journey: typeof Journey.Type, brief: TasksBrief): string[] => {
    const label = `task ${journey.task}`;
    const gaps: string[] = [];
    if (!isKebab(journey.task)) {
        gaps.push(`${label}: the name is not kebab-case (lower-case words joined by hyphens)`);
    }
    if (journey.capability !== brief.capability.id) {
        gaps.push(`${label}: belongs to ${journey.capability}, but this job is for ${brief.capability.id}`);
    }
    const own = new Set<string>(journey.actions);
    const used = new Set<string>();
    journey.steps.forEach((step, at) =>
        step.from.forEach((id) => {
            used.add(id);
            if (!own.has(id)) {
                gaps.push(`${label}, step ${at + 1}: cites ${id}, which is not the task's`);
            }
        }),
    );
    const unused = journey.actions.filter((id) => !used.has(id));
    if (unused.length > 0) {
        gaps.push(`${label}: ${unused.length} entry points are in no step: ${unused.slice(0, 6).join(", ")}`);
    }
    const entities = new Set(brief.entities.map((each) => each.id));
    const externals = new Set(brief.externals.map((each) => each.id));
    journey.facts
        .filter((id) => !entities.has(id))
        .forEach((id) => gaps.push(`${label}: ${id} is no kind of data of the brief`));
    journey.needs
        .filter((id) => !externals.has(id))
        .forEach((id) => gaps.push(`${label}: ${id} is no outside system of the brief`));
    const words = [...new Set([...wordsIn(journey.outcome), ...wordsIn(journey.actor)])];
    if (words.length > 0) {
        gaps.push(`${label}: the outcome or actor names a medium, control or technology (${words.join(", ")})`);
    }
    const spoken = [journey.outcome, journey.actor, ...journey.steps.flatMap((step) => [step.intent, step.system])];
    const names = [...new Set(spoken.flatMap((text) => leaksIn(text, brief.identifiers)))];
    if (names.length > 0) {
        gaps.push(`${label}: its words carry names the code uses (${names.slice(0, 6).join(", ")}): say what is done`);
    }
    return gaps;
};

/**
 * The gate of a tasks job: every entry point and every rule of the brief in exactly one task, each step citing only its
 * task's entry points and every entry point of a task in some step, kinds of data and outside systems from the brief,
 * and the words of the outcome and the actor naming no medium, control or technology, and no name of the old system.
 * @param records the job's records
 * @param brief what the job was given
 * @returns one line per gap
 */
const journeyGaps = (records: readonly Finding[], brief: TasksBrief): string[] => {
    const journeys = ofType(records, RecordIdPrefix.Journey, Journey);
    const tasks = journeys.map((journey) => journey.task);
    return [
        ...onceEach(
            brief.surfaces.flatMap((surface) => surface.actions.map((action) => action.id)),
            journeys.map((journey) => journey.actions),
            { many: "entry points", one: "entry point" },
        ),
        ...onceEach(
            brief.rules.map((rule) => rule.id),
            journeys.map((journey) => journey.rules),
            { many: "rules", one: "rule" },
        ),
        ...(new Set(tasks).size === tasks.length
            ? []
            : ["two tasks share a name: a task's name is unique among the capability's tasks"]),
        ...journeys.flatMap((journey) => taskGaps(journey, brief)),
    ];
};

/**
 * The gate of the joining job: each merge names tasks the brief lists, a task is in at most one merge, and a task
 * absorbs no more than itself once.
 * @param records the job's records
 * @param brief what the job was given
 * @returns one line per gap
 */
const mergeGaps = (records: readonly Finding[], brief: MergeBrief): string[] => {
    const known = new Set(brief.tasks.map((task) => task.id));
    const seen = new Set<string>();
    const gaps: string[] = [];
    for (const merge of ofType(records, RecordIdPrefix.JourneyMerge, JourneyMerge)) {
        for (const id of [merge.keep, ...merge.absorb]) {
            if (!known.has(id)) {
                gaps.push(`task ${id} is not in the brief`);
            }
            if (seen.has(id)) {
                gaps.push(`task ${id} is in two merges`);
            }
            seen.add(id);
        }
        if (merge.absorb.includes(merge.keep)) {
            gaps.push(`task ${merge.keep} is kept and absorbed in one merge`);
        }
    }
    return gaps;
};

/**
 * One job of the journeys as the review rounds take it: its key and files.
 * @param root the analysis root
 * @param job the job
 * @returns the job
 */
export const reviewedJourneyJob = (root: string, job: JourneyJob): ReviewedJob => ({
    stage: "publish",
    key: job.jobId,
    label: job.name,
    ...analysisPaths(root).journeys.files(job.jobId),
});

/**
 * The lines the reviewer of a tasks job must read: every entry point of the brief, whole.
 * @param brief what the job was given
 * @returns the entry points' ranges
 */
const entryPointLines = (brief: TasksBrief) =>
    brief.surfaces.flatMap((surface) => surface.actions.map((action) => action.place));

/**
 * The stage a tasks job is reviewed under: its record type, and its gate, held to its brief. A missed record points at
 * lines in scope.
 * @param root the analysis root
 * @param job the job
 * @returns the stage as the review rounds take it
 */
export const tasksReview = (root: string, job: JourneyJob) => ({
    stage: "publish" as const,
    shapes: { Journey },
    checksFor: (cited: readonly Finding[]) =>
        Effect.gen(function* () {
            const brief = yield* readJourneyBrief(root, job);
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            return {
                records: (records: readonly Finding[]) => (brief.kind === "tasks" ? journeyGaps(records, brief) : []),
                placement: (missed: ReadonlyArray<typeof Missed.Type>) => missedOutside(missed, lineCounts, "manifest"),
                writtenBeside: new Set<string>(),
                scope: brief.kind === "tasks" ? entryPointLines(brief) : [],
            };
        }),
});

/**
 * The stage the joining job is reviewed under: its record type, and its gate, held to its brief.
 * @param root the analysis root
 * @param job the job
 * @returns the stage as the review rounds take it
 */
export const mergeReview = (root: string, job: JourneyJob) => ({
    stage: "publish" as const,
    shapes: { JourneyMerge },
    checksFor: (cited: readonly Finding[]) =>
        Effect.gen(function* () {
            const brief = yield* readJourneyBrief(root, job);
            const lineCounts = yield* (yield* ScopeFiles).lineCountsFor(citedFiles(cited));
            return {
                records: (records: readonly Finding[]) => (brief.kind === "merge" ? mergeGaps(records, brief) : []),
                placement: (missed: ReadonlyArray<typeof Missed.Type>) => missedOutside(missed, lineCounts, "manifest"),
                writtenBeside: new Set<string>(),
            };
        }),
});

/**
 * `check` for a job of the journeys: its gate, and, once its reviewer has written, the review's verdicts and the gate
 * again on what the review would leave.
 * @param root the analysis root
 * @param job the job
 * @returns one line per gap; none when the job passes
 */
export const checkJourneyJob = Effect.fnUntraced(function* (root: string, job: JourneyJob) {
    const reviewed = reviewedJourneyJob(root, job);
    return job.kind === "tasks"
        ? yield* checkReviewedJob(tasksReview(root, job), reviewed)
        : yield* checkReviewedJob(mergeReview(root, job), reviewed);
});
