import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "../model/layout";
import type { ModernizationRequest } from "../model/request";
import { recordFiles } from "../derive/run";
import { readAnalysis } from "../read/analysis";
import { targetGaps } from "../read/confirmed";
import { gateJob, gateReview, type JobFile, type Output } from "./gates";
import { acceptedSoFar, prepareStage, refreshInputs } from "./stages";
import { jobPaths, loadJobs, readJson, saveJobs, writeJson, type Job, type Jobs, type Role } from "./state";

export type Action =
    | { action: "dispatch"; batch: string; agents: { job: string; role: Role; prompt: string }[] }
    | { action: "wait"; batch: string; waitingFor: string[] }
    | { action: "done"; stage: string; summary: string }
    | { action: "stop"; message: string };

const agentOf = (job: Job, role: Role) =>
    role === "reviewer"
        ? "review-planned-stories"
        : ["layers", "integrations", "scope", "goals", "base"].includes(job.kind)
          ? "decide-foundation"
          : "create-stories";

const recordsIn = (output: Output) =>
    [output.layers, output.decisions, output.stories].flatMap((each) => (Array.isArray(each) ? each : []));

const promptOf = (layout: Layout, skillRoot: string, scriptsCommand: string, job: Job, role: Role) => {
    const p = jobPaths(layout, job.id);
    return [
        `Read ${join(skillRoot, "agents", `${agentOf(job, role)}.md`)}, then follow it.`,
        `scriptsCommand: ${scriptsCommand}`,
        `jobId: ${job.id}`,
        `jobPath: ${p.job}`,
        `contextPath: ${p.context}`,
        role === "writer" ? `outputPath: ${p.output}` : `outputPath: ${p.output}\nreviewPath: ${p.review}`,
        ...(role === "writer" && job.feedback !== "" ? [`customInstructions: ${job.feedback}`] : []),
    ].join("\n");
};

const ready = (jobs: Jobs, job: Job) =>
    job.after.every((id) => jobs.jobs.find((each) => each.id === id)?.state === "decided");

/** Runs the gate of a job's output against its input file. */
export const checkJob = (layout: Layout, request: ModernizationRequest, id: string) => {
    const p = jobPaths(layout, id);
    if (!existsSync(p.output)) return [`no output file at ${p.output}`];
    return gateJob(readJson<JobFile>(p.job), readJson<Output>(p.output), request);
};

export const startStage = (layout: Layout, request: ModernizationRequest, stage: "foundation" | "stories"): string => {
    const gaps = targetGaps(layout);
    if (gaps.length > 0)
        return `the target is not confirmed, so the plan cannot start:\n${gaps.map((gap) => `- ${gap}`).join("\n")}`;
    const jobs = loadJobs(layout);
    if (
        stage === "stories" &&
        jobs.jobs.filter((job) => job.stage === "foundation").some((job) => job.state !== "decided")
    )
        return "the foundation stage is not finished: run its jobs and `finish` first";
    if (jobs.batch !== undefined) return "a batch is still open: close it first";
    const next = prepareStage(layout, stage, request, jobs);
    return `${next.jobs.filter((job) => job.stage === stage).length} jobs prepared for ${stage}`;
};

export const next = (layout: Layout, skillRoot: string, scriptsCommand: string, limit: number): Action => {
    const jobs = loadJobs(layout);
    if (jobs.jobs.length === 0) return { action: "stop", message: "no jobs: run `prepare foundation` first" };
    if (jobs.batch !== undefined) {
        const open = jobs.batch.jobs.filter((entry) => !entry.reported).map((entry) => entry.job);
        if (open.length > 0) return { action: "wait", batch: jobs.batch.id, waitingFor: open };
        jobs.batch = undefined;
        saveJobs(layout, jobs);
    }
    const refused = jobs.jobs.filter((job) => job.state === "refused");
    if (refused.length > 0)
        return {
            action: "stop",
            message: `refused jobs: ${refused.map((job) => `${job.id} (${job.feedback.split("\n")[0] ?? ""})`).join("; ")}`,
        };
    const pending = jobs.jobs.filter((job) => job.state !== "decided");
    if (pending.length === 0) {
        const stages = [...new Set(jobs.jobs.map((job) => job.stage))];
        return {
            action: "done",
            stage: stages.at(-1) ?? "",
            summary: `${jobs.jobs.length} jobs decided; run \`finish\``,
        };
    }
    const candidates = pending.filter((job) => ready(jobs, job)).slice(0, limit);
    if (candidates.length === 0)
        return { action: "stop", message: "no job can run: a job waits for one that cannot finish" };
    const batch = {
        id: `batch-${jobs.batches + 1}`,
        stage: candidates[0]!.stage,
        jobs: candidates.map((job) => ({
            job: job.id,
            role: (job.state === "toReview" ? "reviewer" : "writer") as Role,
            reported: false,
        })),
    };
    jobs.batches += 1;
    jobs.batch = batch;
    for (const entry of batch.jobs) jobs.jobs.find((job) => job.id === entry.job)!.running = entry.role;
    for (const entry of batch.jobs) refreshInputs(layout, jobs, entry.job);
    saveJobs(layout, jobs);
    return {
        action: "dispatch",
        batch: batch.id,
        agents: batch.jobs.map((entry) => ({
            job: entry.job,
            role: entry.role,
            prompt: promptOf(
                layout,
                skillRoot,
                scriptsCommand,
                jobs.jobs.find((job) => job.id === entry.job)!,
                entry.role,
            ),
        })),
    };
};

/** The agent of a job has finished: gate its output, or read its review, and move the job on. */
export const done = (layout: Layout, request: ModernizationRequest, id: string): string => {
    const jobs = loadJobs(layout);
    const job = jobs.jobs.find((each) => each.id === id);
    const entry = jobs.batch?.jobs.find((each) => each.job === id);
    if (job === undefined || entry === undefined || job.running === undefined) return `${id} is not in the open batch`;
    entry.reported = true;
    const role = job.running;
    job.running = undefined;
    const p = jobPaths(layout, id);
    const fail = (gaps: string[]) => {
        if (job.fixes < 1) {
            job.fixes += 1;
            job.state = "toFix";
            job.feedback = gaps.join("\n");
        } else {
            job.state = "refused";
            job.feedback = gaps.join("\n");
        }
    };
    if (role === "writer") {
        const gaps = checkJob(layout, request, id);
        if (gaps.length > 0) fail(gaps);
        else {
            job.state = "toReview";
            job.feedback = "";
        }
    } else if (!existsSync(p.review)) {
        job.state = "refused";
        job.feedback = "the reviewer wrote no review file";
    } else {
        const review = readJson<{ read: number; challenges: { record: number; says: string }[] }>(p.review);
        const out = readJson<Output>(p.output);
        const problems = gateReview(review, recordsIn(out).length);
        // A wrong count with challenges still gives a review worth acting on; only a clean pass that miscounted is suspect.
        if (problems.length > 0 && review.challenges.length === 0) {
            job.state = "toReview";
            job.feedback = problems.join("\n");
        } else if (review.challenges.length === 0) {
            job.state = "decided";
        } else if (job.fixes < 1) {
            job.fixes += 1;
            job.state = "toFix";
            job.feedback = review.challenges
                .map((challenge) => `Record ${challenge.record}: ${challenge.says}`)
                .join("\n");
        } else {
            job.state = "decided";
            job.disputes = review.challenges.map((challenge) => `Record ${challenge.record}: ${challenge.says}`);
        }
    }
    saveJobs(layout, jobs);
    return `${id}: ${job.state}`;
};

export const abandon = (layout: Layout, id: string): string => {
    const jobs = loadJobs(layout);
    const job = jobs.jobs.find((each) => each.id === id);
    const entry = jobs.batch?.jobs.find((each) => each.job === id);
    if (job === undefined || entry === undefined) return `${id} is not in the open batch`;
    entry.reported = true;
    job.running = undefined;
    saveJobs(layout, jobs);
    return `${id}: abandoned; it will be handed out again`;
};

export const status = (layout: Layout) => {
    const jobs = loadJobs(layout);
    return jobs.jobs.map(
        (job) =>
            `${job.stage}/${job.id}: ${job.state}${job.fixes > 0 ? ` (fix ${job.fixes})` : ""}${job.disputes.length > 0 ? ` [${job.disputes.length} disputed]` : ""}`,
    );
};

/** Merges the accepted outputs into the run's records, in job order, and lists what stayed disputed. */
export const finish = (layout: Layout, stage: string): string => {
    const jobs = loadJobs(layout);
    const mine = jobs.jobs.filter((job) => job.stage === stage);
    if (mine.length === 0 || mine.some((job) => job.state !== "decided")) return `the ${stage} stage is not finished`;
    const accepted = acceptedSoFar(layout, jobs);
    const stories = jobs.jobs
        .filter((job) => job.state === "decided")
        .flatMap((job) => {
            const path = jobPaths(layout, job.id).output;
            return existsSync(path) ? ((readJson<Output>(path).stories as unknown[] | undefined) ?? []) : [];
        });
    const files = recordFiles(layout);
    writeJson(files.layers, accepted.layers);
    writeJson(files.decisions, accepted.decisions);
    writeJson(files.stories, stories);
    const disputes = jobs.jobs.flatMap((job) => job.disputes.map((says) => ({ job: job.id, says })));
    writeJson(join(layout.records, "disputes.json"), disputes);
    return `${accepted.layers.length} layers, ${accepted.decisions.length} decisions, ${stories.length} stories accepted; ${disputes.length} challenges stayed disputed`;
};

/**
 * Hands a decided job back to its writer with instructions, for a gap found after it was decided: the writer gets one
 * more round.
 * @param layout the run's folders
 * @param id the job
 * @param instructions what to change
 * @returns what happened
 */
export const redo = (layout: Layout, id: string, instructions: string): string => {
    const jobs = loadJobs(layout);
    const job = jobs.jobs.find((each) => each.id === id);
    if (job === undefined) return `no job ${id}`;
    if (jobs.batch?.jobs.some((entry) => !entry.reported)) return "a batch is still open: report its agents first";
    job.state = "toFix";
    job.fixes = 0;
    job.feedback = instructions;
    job.disputes = [];
    job.running = undefined;
    saveJobs(layout, jobs);
    return `${id}: handed back to its writer with the instructions`;
};

/**
 * Decides a job as it stands, keeping what its review challenged as disputed, without a further fix round. For a person
 * who judges another round not worth its cost.
 * @param layout the run's folders
 * @param id the job
 * @returns what happened
 */
export const accept = (layout: Layout, id: string): string => {
    const jobs = loadJobs(layout);
    const job = jobs.jobs.find((each) => each.id === id);
    if (job === undefined) return `no job ${id}`;
    if (job.state !== "toFix" && job.state !== "toReview")
        return `${id} is ${job.state}: only a job waiting for a fix or a review can be accepted`;
    const p = jobPaths(layout, id);
    if (!existsSync(p.output)) return `${id} has no output to accept`;
    const challenges = existsSync(p.review)
        ? readJson<{ challenges: { record: number; says: string }[] }>(p.review).challenges
        : [];
    job.disputes = challenges.map((challenge) => `Record ${challenge.record}: ${challenge.says}`);
    job.state = "decided";
    job.feedback = "";
    job.running = undefined;
    saveJobs(layout, jobs);
    return `${id}: decided, ${job.disputes.length} challenges kept as disputed, no further fix`;
};

/**
 * What the reviewer reads beside each criterion: the criterion's text and, for each rule it cites, the rule's wording
 * from the analysis. Ids and wording only; it judges nothing.
 * @param layout the run's folders
 * @param id the job
 * @returns one block for each record of the job's output, each criterion with the rules it cites
 */
export const cited = (layout: Layout, id: string): string => {
    const p = jobPaths(layout, id);
    if (!existsSync(p.output)) return `no output file at ${p.output}`;
    const stories = readJson<Output>(p.output).stories;
    if (!Array.isArray(stories)) return `${id} has no stories`;
    const says = new Map(
        readAnalysis(layout.analysis).capabilities.flatMap((payload) =>
            payload.layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, rule.says] as const)),
        ),
    );
    return stories
        .flatMap(
            (story: { title?: string; criteria?: { says: string; from: { _tag: string; id: string }[] }[] }, at) => [
                `Record ${at}: ${story.title ?? ""}`,
                ...(story.criteria ?? []).flatMap((criterion, number) => [
                    `  Criterion ${number + 1}: ${criterion.says}`,
                    ...criterion.from
                        .filter((ref) => ref._tag === "rule")
                        .map((ref) => `    cites ${ref.id}: ${says.get(ref.id) ?? "(not in the analysis)"}`),
                ]),
            ],
        )
        .join("\n");
};
