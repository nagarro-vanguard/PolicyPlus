import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "../model/layout";
import { loadLegacy, loadTasks } from "../run";
import {
    gateComponents,
    gateMerge,
    gateReview,
    gateShape,
    gateTasks,
    gateVariants,
    recordCount,
    type JobFile,
    type Output,
} from "./gates";
import { componentContext, designContext, refreshInputs } from "./stages";
import { jobPaths, loadJobs, readJson, saveJobs, type Job, type Jobs, type Role } from "./state";

export type Action =
    | { action: "dispatch"; batch: string; agents: { job: string; role: Role; prompt: string }[] }
    | { action: "wait"; batch: string; waitingFor: string[] }
    | { action: "done"; stage: string; summary: string }
    | { action: "stop"; message: string };

const agentOf = (job: Job, role: Role) =>
    role === "reviewer"
        ? "challenge-target"
        : job.kind === "tasks" || job.kind === "merge"
          ? "describe-current"
          : job.kind === "variants"
            ? "propose-journeys"
            : "propose-architecture";

const promptOf = (layout: Layout, skillRoot: string, scriptsCommand: string, job: Job, role: Role) => {
    const p = jobPaths(layout, job.id);
    return [
        `Read ${join(skillRoot, "agents", `${agentOf(job, role)}.md`)}, then follow it.`,
        `scriptsCommand: ${scriptsCommand}`,
        `jobId: ${job.id}`,
        `jobPath: ${p.job}`,
        `contextPath: ${p.context}`,
        role === "writer"
            ? `outputPath: ${p.output}`
            : `outputPath: ${p.output}\nreviewPath: ${p.review}\nlegacyPath: ${layout.legacy}`,
        ...(role === "writer" && job.feedback !== "" ? [`customInstructions: ${job.feedback}`] : []),
    ].join("\n");
};

const ready = (jobs: Jobs, job: Job) =>
    job.after.every((id) => jobs.jobs.find((each) => each.id === id)?.state === "decided");

/** Runs the gate of a job's output against its input file. */
export const checkJob = (layout: Layout, id: string): string[] => {
    const p = jobPaths(layout, id);
    if (!existsSync(p.output)) return [`no output file at ${p.output}`];
    const file = readJson<JobFile>(p.job);
    const output = readJson<Output>(p.output);
    if (file.kind === "tasks") return gateTasks(file, output, loadLegacy(layout));
    if (file.kind === "merge") return gateMerge(file, output);
    if (file.kind === "variants") return gateVariants(file, output, loadTasks(layout));
    if (file.kind === "shape") return gateShape(output, designContext(layout));
    const context = componentContext(layout, loadJobs(layout), file.domain ?? "");
    return context === undefined
        ? ["the chosen architecture does not have this domain"]
        : gateComponents(output, context);
};

export const next = (layout: Layout, skillRoot: string, scriptsCommand: string, limit: number): Action => {
    const jobs = loadJobs(layout);
    if (jobs.jobs.length === 0) return { action: "stop", message: "no jobs: run `prepare <stage>` first" };
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
        stage: candidates[0]?.stage ?? "",
        jobs: candidates.map((job) => ({
            job: job.id,
            role: (job.state === "toReview" ? "reviewer" : "writer") as Role,
            reported: false,
        })),
    };
    jobs.batches += 1;
    jobs.batch = batch;
    for (const entry of batch.jobs) {
        const job = jobs.jobs.find((each) => each.id === entry.job);
        if (job !== undefined) job.running = entry.role;
    }
    for (const entry of batch.jobs) refreshInputs(layout, jobs, entry.job);
    saveJobs(layout, jobs);
    return {
        action: "dispatch",
        batch: batch.id,
        agents: batch.jobs.flatMap((entry) => {
            const job = jobs.jobs.find((each) => each.id === entry.job);
            return job === undefined
                ? []
                : [
                      {
                          job: entry.job,
                          role: entry.role,
                          prompt: promptOf(layout, skillRoot, scriptsCommand, job, entry.role),
                      },
                  ];
        }),
    };
};

/** The agent of a job has finished: gate its output, or read its review, and move the job on. */
export const done = (layout: Layout, id: string): string => {
    const jobs = loadJobs(layout);
    const job = jobs.jobs.find((each) => each.id === id);
    const entry = jobs.batch?.jobs.find((each) => each.job === id);
    if (job === undefined || entry === undefined || job.running === undefined) return `${id} is not in the open batch`;
    entry.reported = true;
    const role = job.running;
    job.running = undefined;
    const p = jobPaths(layout, id);
    const fail = (gaps: string[]) => {
        job.feedback = gaps.join("\n");
        if (job.fixes < 1) {
            job.fixes += 1;
            job.state = "toFix";
        } else job.state = "refused";
    };
    if (role === "writer") {
        const gaps = checkJob(layout, id);
        if (gaps.length > 0) fail(gaps);
        else {
            job.state = job.review ? "toReview" : "decided";
            job.feedback = "";
        }
    } else if (!existsSync(p.review)) {
        job.state = "refused";
        job.feedback = "the reviewer wrote no review file";
    } else {
        const review = readJson<{ read: number; challenges: { record: number; says: string }[] }>(p.review);
        const problems = gateReview(review, recordCount(readJson<Output>(p.output)));
        if (problems.length > 0 && review.challenges.length === 0) {
            job.state = "toReview";
            job.feedback = problems.join("\n");
        } else if (review.challenges.length === 0) job.state = "decided";
        else if (job.fixes < 1) {
            job.fixes += 1;
            job.state = "toFix";
            job.feedback = review.challenges.map((each) => `Record ${each.record}: ${each.says}`).join("\n");
        } else {
            job.state = "decided";
            job.disputes = review.challenges.map((each) => `Record ${each.record}: ${each.says}`);
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

export const status = (layout: Layout) =>
    loadJobs(layout).jobs.map(
        (job) =>
            `${job.stage}/${job.id}: ${job.state}${job.fixes > 0 ? ` (fix ${job.fixes})` : ""}${job.disputes.length > 0 ? ` [${job.disputes.length} disputed]` : ""}`,
    );

/**
 * Hands a decided job back to its writer with instructions, for a gap that only shows once every job is in: the stage's
 * final checks name the job to run again, and the writer gets one more round.
 * @param layout the run's folders
 * @param id the job
 * @param instructions what to change, from the gap
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

/** Decides a job as it stands, keeping what its review challenged as disputed, without a further fix round. */
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
    job.disputes = challenges.map((each) => `Record ${each.record}: ${each.says}`);
    job.state = "decided";
    job.feedback = "";
    job.running = undefined;
    saveJobs(layout, jobs);
    return `${id}: decided, ${job.disputes.length} challenges kept as disputed, no further fix`;
};
