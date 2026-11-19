import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Layout } from "../model/layout";

export type Stage = "journeys" | "architecture" | "components";
export type Kind = "variants" | "shape" | "components";
export type JobState = "toRun" | "toReview" | "toFix" | "decided" | "refused";
export type Role = "writer" | "reviewer";

export type Job = {
    id: string;
    stage: Stage;
    kind: Kind;
    title: string;
    after: string[];
    /** Whether a second agent reads the output before the job is decided. */
    review: boolean;
    state: JobState;
    fixes: number;
    feedback: string;
    /** The role last dispatched and not yet reported. */
    running?: Role;
    /** The challenges that survived the fix; jobs decided before they carried their record hold `Record <n>: <says>`. */
    disputes: (JobDispute | string)[];
};
export type JobDispute = { record: number; says: string };
export type Batch = { id: string; stage: string; jobs: { job: string; role: Role; reported: boolean }[] };
export type Jobs = { jobs: Job[]; batch?: Batch; batches: number };

export const jobPaths = (layout: Layout, id: string) => ({
    job: join(layout.work, "jobs", `${id}.job.json`),
    context: join(layout.work, "jobs", `${id}.context.json`),
    output: join(layout.work, "output", `${id}.json`),
    review: join(layout.work, "output", `${id}.review.json`),
});

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
export const writeJson = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
export const loadJobs = (layout: Layout): Jobs =>
    existsSync(layout.jobs) ? readJson<Jobs>(layout.jobs) : { jobs: [], batches: 0 };
export const saveJobs = (layout: Layout, jobs: Jobs) => writeJson(layout.jobs, jobs);

/** The output of a decided job, or nothing when it has none yet. */
export const outputOf = <T>(layout: Layout, id: string): T | undefined => {
    const path = jobPaths(layout, id).output;
    return existsSync(path) ? readJson<T>(path) : undefined;
};
