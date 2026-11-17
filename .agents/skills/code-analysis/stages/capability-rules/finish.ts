import { Effect } from "effect";
import { FileAccess } from "../../shared/source/file-access";
import { JobStates } from "../../shared/jobs/job-state";
import { decideEveryJob, setRoundsAside, settleOutcomes } from "../../shared/read/reviewed-jobs";
import { requireAcceptedRecords } from "../../shared/store/stage-guards";
import { StageRecords, type StageWriteDecision } from "../../shared/store/stage-records";
import { reviewOutcome, type ReviewOutcome, type ReviewedJob } from "../../shared/jobs/review-rounds";
import { GapsRemain } from "../../shared/run/script-errors";
import { staleBrief } from "./brief";
import { stageReview } from "./check";
import { definitionOf, jobNamed, readJobList, reviewedJob, type Kind } from "./jobs";
import { acceptedLives } from "./lives";
import { prepareStage } from "./prepare";

type Reviewed = Effect.Success<ReturnType<typeof reviewedJob>>;

export type StageOutcome = ReviewOutcome<Reviewed["job"]>;

type Settled = ReadonlyArray<ReviewOutcome<ReviewedJob>>;

export type RulesDecision = {
    readonly written: boolean;
    readonly lives: readonly StageOutcome[];
    readonly rules: readonly StageOutcome[];
};

/**
 * Every listed job, as the review rounds take it, by kind, and whether each has run; refused while the jobs no longer
 * stand for today's inputs: the brief built today differs (an earlier stage wrote again, D48), or a job's file is no
 * longer the job that was cut.
 * @param root the analysis root
 * @returns the jobs of each kind that ran, how many of each kind there are,
 */
const readCurrentJobs = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const states = yield* JobStates;
    const gaps = [...(yield* staleBrief(root))];
    const ran: Record<Kind, Array<Reviewed["job"]>> = { lifecycle: [], rules: [] };
    const listed: Record<Kind, number> = { lifecycle: 0, rules: 0 };
    for (const { jobId, kind, definition } of yield* readJobList(root)) {
        const { state, job } = yield* reviewedJob(root, jobId);
        listed[kind] += 1;
        if (definitionOf(state) !== definition) {
            gaps.push(`${jobId}'s file is no longer the job that was cut: run explain-capability-rules.ts prepare`);
        }
        const row = yield* states.get(job.stage, job.key);
        let hasRun = row !== undefined && (row.state !== "toRun" || row.feedback !== undefined);
        for (const path of [job.outputPath, job.reviewPath]) {
            hasRun = hasRun || (yield* fs.exists(path));
        }
        if (hasRun) {
            ran[kind].push(job);
        }
    }
    if (gaps.length) {
        return yield* new GapsRemain({ gaps });
    }
    return { ran, listed };
});

/**
 * What `finish` decided, and the reports and feedback it changes once the store write is over (D74).
 * @param written whether the store keeps the write
 * @param decision the lives' and the rules' outcomes
 * @param settled each outcome whose report and feedback are written after the write
 * @returns the decision
 */
const decided = (
    written: boolean,
    decision: Omit<RulesDecision, "written">,
    settled: Settled,
): StageWriteDecision<RulesDecision & { readonly settled: Settled }> => ({
    commit: written,
    result: { written, ...decision, settled },
});

/**
 * How one job is decided: by its review against the accepted transitions.
 * @param root the analysis root
 * @param transitions the record ids of the accepted transitions
 * @returns the decision, given a job
 */
const decideJob = (root: string, transitions: ReadonlySet<string>) => (job: Reviewed["job"]) =>
    Effect.gen(function* () {
        return yield* reviewOutcome(stageReview(yield* jobNamed(root, job.jobId), transitions), job);
    });

/**
 * `finish`: decide Capability rules in two steps, each inside one transaction of the record store (D71, D124). Refused
 * until Capabilities and entities has accepted records, and while the jobs are stale. First the lives: any to redo is
 * set aside with its feedback; once none is, each life's outcome is reported, which lets the rules jobs run, from the
 * accepted lives. Then the rules: any to redo is set aside; once none is, the accepted lives, transitions, rules and
 * facts are written in one commit, never a writer's receipt; a refused job keeps its feedback, and the run page shows
 * it to the person (D165). Reports and feedback change only once the write is over (D74). Once every life is decided
 * and no rules job has run, the rules jobs are cut again, so the blocks holding each accepted transition's `writtenAt`
 * lines are read too.
 * @param root the analysis root
 * @returns the lives' and the rules' outcomes, and whether the stage's records were written
 */
export const finishCapabilityRules = Effect.fnUntraced(function* (root: string) {
    yield* requireAcceptedRecords("capabilities-and-entities");
    const { ran, listed } = yield* readCurrentJobs(root);
    const result = yield* (yield* StageRecords).writeStageRecords("capability-rules", (writer) =>
        Effect.gen(function* () {
            if (ran.lifecycle.length < listed.lifecycle) {
                return yield* new GapsRemain({ gaps: ["a life has not run yet: run next, which runs it first"] });
            }
            const transitionIds = (yield* acceptedLives(root)).transitions.map((each) => each.id);
            const decide = decideJob(root, new Set(transitionIds));
            const lives = yield* decideEveryJob(writer, "capability-rules", ran.lifecycle, decide);
            const livesToRedo = lives.filter((each) => each.outcome === "redo");
            if (livesToRedo.length) {
                yield* setRoundsAside(livesToRedo);
                return decided(false, { lives, rules: [] }, []);
            }
            if (!ran.rules.length) {
                return decided(false, { lives, rules: [] }, lives);
            }
            if (ran.rules.length < listed.rules) {
                return yield* new GapsRemain({ gaps: ["a rules job has not run yet: run next, which runs it"] });
            }
            const rules = yield* decideEveryJob(writer, "capability-rules", ran.rules, decide);
            const rulesToRedo = rules.filter((each) => each.outcome === "redo");
            if (rulesToRedo.length) {
                yield* setRoundsAside(rulesToRedo);
                return decided(false, { lives, rules }, []);
            }
            return decided(true, { lives, rules }, [...lives, ...rules]);
        }),
    );
    yield* settleOutcomes(result.settled);
    if (!result.written && !ran.rules.length && !result.lives.some((each) => each.outcome === "redo")) {
        yield* prepareStage(root, []);
    }
    const decision: RulesDecision = {
        written: result.written,
        lives: result.lives,
        rules: result.rules,
    };
    return decision;
});

/**
 * What a `finish` leaves the loop to do next, and what it says: the records written; lives or rules to redo; or every
 * life decided, so the rules jobs run next.
 * @param decision what `finish` decided
 * @returns whether the loop has more to run, and the lines to say
 */
export const nextAfterFinish = (decision: RulesDecision) => {
    const count = (outcomes: readonly StageOutcome[], what: string) =>
        `${what}: ${(["accepted", "redo", "refused"] as const).map((outcome) => `${outcomes.filter((each) => each.outcome === outcome).length} ${outcome}`).join(", ")}`;
    const said = [
        count(decision.lives, "lives"),
        ...(decision.rules.length ? [count(decision.rules, "rules jobs")] : []),
    ];
    if (decision.written) {
        return { more: false, said: [...said, "Capability rules' accepted records are written"] };
    }
    const redo = [...decision.lives, ...decision.rules].some((each) => each.outcome === "redo");
    return redo
        ? { more: true, said }
        : { more: true, said: [...said, "every life is decided: the rules jobs run next, gating its transitions"] };
};
