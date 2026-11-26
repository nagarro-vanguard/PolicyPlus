import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Layout } from "../model/layout";

export type Kind =
    "layers" | "integrations" | "scope" | "goals" | "base" | "foundation-stories" | "journey" | "components";
export type JobState = "toRun" | "toReview" | "toFix" | "decided" | "refused";
export type Role = "writer" | "reviewer";

export type Job = {
    id: string;
    stage: "foundation" | "stories";
    kind: Kind;
    title: string;
    after: string[];
    state: JobState;
    fixes: number;
    feedback: string;
    /** The role last dispatched and not yet reported. */
    running?: Role;
    disputes: string[];
};

export type Batch = { id: string; stage: string; jobs: { job: string; role: Role; reported: boolean }[] };
export type Jobs = { stages: string[]; jobs: Job[]; batch?: Batch; batches: number };

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
    existsSync(layout.jobs) ? readJson<Jobs>(layout.jobs) : { stages: [], jobs: [], batches: 0 };
export const saveJobs = (layout: Layout, jobs: Jobs) => writeJson(layout.jobs, jobs);

export const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
