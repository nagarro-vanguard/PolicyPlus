import { Effect } from "effect";
import { FeedbackItem } from "../model/schemas/feedback";
import { dispatchOf, scratchFolderOf } from "./dispatch-prompt";
import { FileAccess } from "../source/file-access";
import { owesFix, refuseJob, rejectedPathOf, setGateRoundAside } from "./job-transitions";
import { RandomIds } from "../run/hashing-and-random";
import { JobStates } from "./job-state";
import type { BatchRow } from "./job-state-types";
import { StageRecords } from "../store/stage-records";
import { isScriptError } from "../run/script-errors";
import type { Dispatch, AssumptionNotice, StageActions } from "../model/schemas/stage-actions";
import { asReviewed, decided, reviewedJobState, type LoopJob, type StageLoop } from "./loop-jobs";
import type { ReviewedJob } from "./review-rounds";
import { secondRoundOf } from "./second-round";

/**
 * A review that failed its own check, or never arrived (6.3): the first time it is kept aside and run again; the second
 * time the job is refused, never written unreviewed, never retried for ever (D29); a job's second review, which only
 * looks again at what its fix changed, is given up instead and the fixed job stands as corrected.
 * @param job the job
 * @returns nothing once acted on
 */
const reviewFailed = Effect.fnUntraced(function* (job: ReviewedJob) {
    const fs = yield* FileAccess;
    const states = yield* JobStates;
    const { reviewAttempts, fixes } = yield* states.ensure(job.stage, job.key);
    const attempts = reviewAttempts + 1;
    if (attempts >= 2 && fixes.review) {
        yield* fs.remove(job.reviewPath);
        yield* states.update(job.stage, job.key, { state: "decided" });
    } else if (attempts >= 2) {
        yield* refuseJob(job, []);
    } else if (yield* fs.exists(job.reviewPath)) {
        yield* fs.move(job.reviewPath, rejectedPathOf(job.reviewPath));
    }
    yield* states.update(job.stage, job.key, { reviewAttempts: attempts });
});

/**
 * Take one closed agent pass: its gate's gaps send the job back for its gate fix, once in a cycle, with the gaps as
 * feedback, and refuse it once that fix is taken (D58, P1.35); an output that passes goes to its review, or, when it
 * answers its review's challenges, to a second review of what the fix changed (`secondRoundOf`), the last agent pass,
 * or is decided when the fix changed and dropped nothing.
 * @param job the job
 * @param gaps what its gate found
 * @returns nothing once acted on
 */
const agentClosed = Effect.fnUntraced(function* (job: ReviewedJob, gaps: readonly string[]) {
    const { fixes } = yield* (yield* JobStates).ensure(job.stage, job.key);
    if (!gaps.length) {
        const judgeAgain = fixes.review && (yield* secondRoundOf(job)) !== undefined;
        yield* (yield* JobStates).update(job.stage, job.key, {
            state: fixes.review && !judgeAgain ? "decided" : "toReview",
        });
    } else if (owesFix(fixes, FeedbackItem.fromGaps("gate", gaps))) {
        yield* setGateRoundAside(job, gaps);
    } else {
        yield* refuseJob(job, gaps);
    }
});

/**
 * Take one closed review pass: a review that is missing or fails its own check is counted and run again once; a clean
 * one decides the job for now, and `finish` applies what it challenges.
 * @param job the job
 * @param gaps what its check found; none is read when the review was never written
 * @returns nothing once acted on
 */
const reviewClosed = Effect.fnUntraced(function* (job: ReviewedJob, gaps: readonly string[]) {
    if (gaps.length) {
        yield* reviewFailed(job);
    } else {
        yield* (yield* JobStates).update(job.stage, job.key, { state: "decided" });
    }
});

/**
 * Close the jobs of an open batch their harness reported done: read the assumptions each agent wrote, for the person
 * (D165), then run its gate on what its agent wrote and act on any gaps, so an assumption in an output set aside is
 * still seen; then hand the stage the jobs its agents ran (`afterClose`: the Map adds the entries they wrote to the
 * registry the next batch reads, P1.38). A job not reported done stays in the batch, and is not handed out again.
 * @param loop the stage
 * @param open the batch
 * @returns the assumptions read
 */
const closeBatch = Effect.fnUntraced(function* (loop: StageLoop, open: BatchRow) {
    const states = yield* JobStates;
    const fs = yield* FileAccess;
    const assumptions: AssumptionNotice[] = [];
    const ran: LoopJob[] = [];
    for (const entry of open.jobs.filter((each) => each.done && !each.closed)) {
        const job = yield* loop.job(entry.key);
        const reviewed = asReviewed(loop.stage, job);
        if (entry.pass === "agent") {
            assumptions.push(...(yield* loop.notices(job)));
            ran.push(job);
            yield* agentClosed(reviewed, yield* loop.check(job));
        } else if (yield* fs.exists(reviewed.reviewPath)) {
            yield* reviewClosed(reviewed, yield* loop.check(job));
        } else {
            yield* reviewClosed(reviewed, ["the reviewer wrote nothing"]);
        }
        yield* states.closeJob(loop.stage, open.id, entry.key, entry.pass);
    }
    yield* loop.afterClose(ran);
    return assumptions;
});

/**
 * The jobs to hand out now, in the stage's order, up to the limit: those to run and those to review, each only when the
 * stage lets it run, none already in a batch. It stops reading once it has enough.
 * @param loop the stage
 * @param limit the most jobs
 * @returns the jobs to run, by key, and the jobs to review
 */
const collect = Effect.fnUntraced(function* (loop: StageLoop, limit: number) {
    const stored = new Map((yield* (yield* JobStates).list(loop.stage)).map((row) => [row.key, row] as const));
    const run: string[] = [];
    const review: LoopJob[] = [];
    for (const key of yield* loop.keys) {
        if (run.length + review.length >= limit) {
            break;
        }
        const row = stored.get(key);
        if (row !== undefined && row.batch !== undefined) {
            continue;
        }
        const job = yield* loop.job(key);
        const state = yield* reviewedJobState({ stage: loop.stage, key });
        if (!decided(state) && (yield* loop.mayRun(job))) {
            if (state === "toRun") {
                run.push(key);
            } else {
                review.push(job);
            }
        }
    }
    return { run, review };
});

/**
 * The size, in bytes, of what an agent is given: its brief and every argument that names a file.
 * @param dispatches the dispatches of a batch
 * @returns the size
 */
const promptBytesOf = Effect.fnUntraced(function* (dispatches: readonly Dispatch[]) {
    const fs = yield* FileAccess;
    let bytes = 0;
    for (const dispatch of dispatches) {
        for (const path of [dispatch.brief, ...Object.values(dispatch.arguments)]) {
            if (path.startsWith("/") && (yield* fs.exists(path)) && !(yield* fs.isDirectory(path))) {
                bytes += (yield* fs.readBytes(path)).length;
            }
        }
        bytes += dispatch.prompt.length;
    }
    return bytes;
});

/**
 * Hand out a batch: prepare the jobs to run, give the reviews' calls, empty each agent's working folder so no agent
 * reads an earlier run's notes (plan 0005), record the batch with the size of what its agents read and the registry
 * they read, and give every dispatch, with the assumptions of the batch just closed. The batch is recorded in one
 * transaction that refuses a second open batch, so a second driver arriving at the same moment waits instead of
 * handing the jobs out again (D75).
 * @param loop the stage
 * @param work the jobs to run, by key, and the jobs to review
 * @param work.run the jobs to run, by key
 * @param work.review the jobs to review
 * @param assumptions the assumptions of the batch just closed
 * @returns the dispatch action
 */
const handOut = Effect.fnUntraced(function* (
    loop: StageLoop,
    work: { readonly run: readonly string[]; readonly review: readonly LoopJob[] },
    assumptions: readonly AssumptionNotice[],
) {
    const { run, review } = work;
    const fs = yield* FileAccess;
    const states = yield* JobStates;
    const prepared = run.length ? yield* loop.prepare(run) : [];
    const calls = [...prepared];
    for (const job of review) {
        calls.push({ key: job.key, call: yield* loop.review(job) });
    }
    for (const { call } of calls) {
        const folder = scratchFolderOf(call);
        if (folder !== undefined) {
            yield* fs.remove(folder);
        }
    }
    const dispatches = calls.map((each) => dispatchOf(each.key, each.call));
    const [batch = ""] = yield* (yield* RandomIds).next("batch", 1, 12);
    const jobs = [
        ...prepared.map((each) => ({ key: each.key, pass: "agent" as const })),
        ...review.map((job) => ({ key: job.key, pass: "review" as const })),
    ];
    for (const job of jobs) {
        yield* states.ensure(loop.stage, job.key);
    }
    const registry = yield* loop.registry;
    const opened = yield* states.openBatch(loop.stage, {
        id: batch,
        jobs,
        promptBytes: yield* promptBytesOf(dispatches),
        ...(registry === undefined ? {} : { registry }),
    });
    const [first, ...rest] = dispatches;
    if (!opened || first === undefined) {
        const open = yield* states.openBatchOf(loop.stage);
        const lost: StageActions = {
            next: "wait",
            batch: open === undefined ? batch : open.id,
            said: "another driver opened a batch at the same moment: only that driver closes it",
            assumptions,
        };
        return lost;
    }
    const action: StageActions = { next: "dispatch", batch, dispatch: [first, ...rest], assumptions };
    return action;
});

/**
 * After the last batch: done once the stage's records are written since its last `prepare` (any `prepare` removes them);
 * otherwise finish, and hand out again what a finish sets to run again. A finish asking for more work that no job can
 * do stops the stage, never loops.
 * @param loop the stage
 * @param limit the most jobs a batch holds
 * @param assumptions the assumptions of the batch just closed, carried on whatever action comes next
 * @returns the next action
 */
const runOrFinish = Effect.fnUntraced(function* (
    loop: StageLoop,
    limit: number,
    assumptions: readonly AssumptionNotice[],
) {
    for (let finishes = 0; ; finishes += 1) {
        const work = yield* collect(loop, limit);
        if (work.run.length || work.review.length) {
            return yield* handOut(loop, work, assumptions);
        }
        if (yield* (yield* StageRecords).stageHasAcceptedRecords(loop.stage)) {
            const action: StageActions = {
                next: "done",
                said: [`${loop.stage} is complete: its pages show what it found`],
                assumptions,
            };
            return action;
        }
        if (finishes > 0) {
            const action: StageActions = {
                next: "stop",
                said: `${loop.stage}: finish asks for more work, but no job can run`,
                assumptions,
            };
            return action;
        }
        const finished = yield* loop.finish;
        if (!finished.more) {
            const action: StageActions = {
                next: "done",
                said: [...finished.said, "its pages show what it found"],
                assumptions,
            };
            return action;
        }
    }
});

/**
 * The batch an open one leaves once its done jobs are closed: waiting, naming the agents not yet reported done.
 * @param left the batch, with the jobs still in flight
 * @param assumptions the assumptions of the jobs just closed
 * @returns the wait action
 */
const waitingFor = (left: BatchRow, assumptions: readonly AssumptionNotice[]) => {
    const flying = left.jobs.filter((job) => !job.closed).map((job) => job.key);
    const action: StageActions = {
        next: "wait",
        batch: left.id,
        said: `batch ${left.id} still holds ${flying.length} agents not reported done (${flying.join(", ")}): report each with done <job>, or release a crashed one with abandon <job>, then next --after ${left.id}`,
        assumptions,
    };
    return action;
};

/**
 * Keep why a step stopped while it stands, so the stage's page says it, and forget it once a step proceeds (D103).
 * @param loop the stage
 * @param action the action the stage's steps gave
 * @returns nothing once kept or forgotten
 */
const recordStop = Effect.fnUntraced(function* (loop: StageLoop, action: StageActions) {
    yield* (yield* JobStates).stop(loop.stage, action.next === "stop" ? action.said : undefined);
});

/**
 * The action once the open batch, if any, is dealt with: closing the jobs the harness reported done; a batch that still
 * holds jobs not reported done keeps the stage waiting, and one already closed is closed no more.
 * @param loop the stage
 * @param limit the most agents one batch holds
 * @param after the batch the driver has finished, when it has one
 * @returns the next action
 */
const afterBatch = Effect.fnUntraced(function* (loop: StageLoop, limit: number, after: string | undefined) {
    const states = yield* JobStates;
    const open = yield* states.openBatchOf(loop.stage);
    if (open === undefined) {
        const last = yield* states.lastBatch(loop.stage);
        if (after !== undefined && (last === undefined || last.id !== after)) {
            const stopped: StageActions = {
                next: "stop",
                said: `no batch is open, so ${after} is closed already: run next without --after`,
                assumptions: [],
            };
            return stopped;
        }
        return yield* Effect.andThen(loop.begin, runOrFinish(loop, limit, []));
    }
    if (after === undefined) {
        const waiting: StageActions = {
            next: "wait",
            batch: open.id,
            said: `batch ${open.id} is open: run its agents, report each with done <job>, then next --after ${open.id}`,
            assumptions: [],
        };
        return waiting;
    }
    if (after !== open.id) {
        const stopped: StageActions = {
            next: "stop",
            said: `the open batch is ${open.id}, not ${after}`,
            assumptions: [],
        };
        return stopped;
    }
    const assumptions = yield* closeBatch(loop, open);
    const left = yield* states.openBatchOf(loop.stage);
    if (left !== undefined) {
        return waitingFor(left, assumptions);
    }
    return yield* Effect.andThen(loop.begin, runOrFinish(loop, limit, assumptions)).pipe(
        Effect.catch((error) =>
            isScriptError(error)
                ? Effect.succeed<StageActions>({ next: "stop", said: error.message, assumptions })
                : Effect.fail(error),
        ),
    );
});

/**
 * `next`: advance a stage as far as the scripts can, then hand its driver the agent work to do now (D56). An open batch
 * is closed only for the jobs its harness reported done, by the driver that holds it (`after`), so no job is ever handed
 * out twice (D57); a refusal of any step is `stop` with its own message, never retried (D59). Every action carries the
 * assumptions of the batch it closed, a stop included, so the person sees each one as soon as its batch closes (D66).
 * The action the stage's steps give renders the stage's view, its page and the run page first (D82): a render that
 * fails stops, since the person would read a stale page.
 * @param loop the stage
 * @param limit the most agents one batch holds
 * @param after the batch the driver has finished, when it has one
 * @returns the next action
 */
export const advance = (loop: StageLoop, limit: number, after: string | undefined) =>
    Effect.gen(function* () {
        const action: StageActions = yield* afterBatch(loop, limit, after).pipe(
            Effect.catch((error) =>
                isScriptError(error)
                    ? Effect.succeed<StageActions>({ next: "stop", said: error.message, assumptions: [] })
                    : Effect.fail(error),
            ),
        );
        yield* recordStop(loop, action);
        return action;
    }).pipe(
        Effect.catch((error) =>
            isScriptError(error)
                ? Effect.succeed<StageActions>({ next: "stop", said: error.message, assumptions: [] })
                : Effect.fail(error),
        ),
    );
