import type { Effect } from "effect";
import type { Stage } from "../run/analysis-layout";
import type { ReviewReport } from "./review-report";
import type { Feedback } from "../model/schemas/feedback";
import type { JobStateFailed, JobStateOutdated } from "../run/script-errors";

export const jobStateNames = ["toRun", "toReview", "toFix", "decided", "refused"] as const;

type JobStateName = (typeof jobStateNames)[number];

type Pass = "agent" | "review";

export type FixesTaken = { readonly gate: boolean; readonly review: boolean };

export type JobRow = {
    readonly stage: Stage;
    readonly key: string;
    readonly state: JobStateName;
    readonly round: number;
    readonly fixes: FixesTaken;
    readonly reviewAttempts: number;
    readonly feedback: Feedback | undefined;
    readonly report: typeof ReviewReport.Type | undefined;
    readonly batch: string | undefined;
};

export type JobPatch = {
    readonly state?: JobStateName;
    readonly round?: number;
    readonly fixes?: FixesTaken;
    readonly reviewAttempts?: number;
    readonly feedback?: Feedback | null;
    readonly report?: typeof ReviewReport.Type | null;
};

export type BatchJob = { readonly key: string; readonly pass: Pass; readonly done: boolean; readonly closed: boolean };

export type BatchRow = {
    readonly stage: Stage;
    readonly id: string;
    readonly dispatchedAt: string;
    readonly closedAt: string | undefined;
    readonly registryHash: string | undefined;
    readonly registryBytes: number | undefined;
    readonly promptBytes: number;
    readonly jobs: readonly BatchJob[];
};

export type NewBatch = {
    readonly id: string;
    readonly jobs: ReadonlyArray<{ readonly key: string; readonly pass: Pass }>;
    readonly promptBytes: number;
    readonly registry?: { readonly hash: string; readonly bytes: number };
};

export type StateFailure = JobStateFailed | JobStateOutdated;

type Op<A> = Effect.Effect<A, StateFailure>;

export interface JobStatesOps {
    readonly path: string;
    readonly get: (stage: Stage, key: string) => Op<JobRow | undefined>;
    readonly ensure: (stage: Stage, key: string) => Op<JobRow>;
    readonly update: (stage: Stage, key: string, patch: JobPatch) => Op<void>;
    readonly list: (stage: Stage) => Op<readonly JobRow[]>;
    readonly remove: (stage: Stage, key: string) => Op<void>;
    readonly clearStage: (stage: Stage) => Op<void>;
    readonly openBatch: (stage: Stage, batch: NewBatch) => Op<boolean>;
    readonly openBatchOf: (stage: Stage) => Op<BatchRow | undefined>;
    readonly lastBatch: (stage: Stage) => Op<BatchRow | undefined>;
    readonly markDone: (stage: Stage, key: string, seconds: number | undefined) => Op<boolean>;
    readonly abandon: (stage: Stage, key: string) => Op<boolean>;
    readonly closeJob: (stage: Stage, batch: string, key: string, pass: Pass) => Op<void>;
    readonly forgetClosedBatches: (stage: Stage) => Op<void>;
    readonly stop: (stage: Stage, reason: string | undefined) => Op<void>;
    readonly stopped: (stage: Stage) => Op<string | undefined>;
    readonly document: (stage: Stage, name: string) => Op<string | undefined>;
    readonly setDocument: (stage: Stage, name: string, body: string | undefined) => Op<void>;
}
