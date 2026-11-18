import { Console, Effect } from "effect";
import { Argument, Command } from "effect/cli";
import { runFolderArgument } from "./arguments";
import { FeedbackItem } from "./feedback";
import {
    defectLine,
    outOfRounds,
    planReviewSpent,
    reviewItem,
    routePlanDefects,
    unownedReason,
    type Owner,
} from "./review-routing";
import { readRecords, recordsOf, type RecordOf } from "./record-files";
import { needsAction, printOutcome } from "./run-script";
import { ImplementRequest, PlanRequest } from "./delivery-request";
import {
    approverFeedback,
    checkCommand,
    checklistPath,
    handBackGap,
    markAccepted,
    prepareAgent,
    printPrepared,
    readPlanRequest,
    readStageInput,
    roundsUsed,
    skillProblemsIn,
    writeFeedback,
} from "./stage";
import { maxRounds, planReviewRounds } from "./policy";
import { System } from "./system";
import type { Render } from "./render-run";
import { renderAfter, renderCommand } from "./render-step";
import { reviewBrief, type Review } from "./review-brief";
import { requireReviewInputs, reviewGaps, reviewView } from "./review-check";
import { approvalMarkerText } from "./implement-request";
import { runLayout, type RunLayout } from "./run-layout";
import { join } from "node:path";
import { defectsForApprover } from "./plan-containment";
import { reviewAgent } from "./dispatch-prompt";

/**
 * Reads the run's plan request, and for a change review its implement request, and works out where the run's files live.
 * @param runFolder the run's folder
 * @param review which review
 * @returns the layout, the plan request, and the implement request for a change review
 */
const runOf = Effect.fnUntraced(function* (runFolder: string, review: Review) {
    const plan = yield* readPlanRequest(reviewAgent, runFolder);
    const layout = runLayout(plan.codebase, plan.workItemId);
    const build =
        review === "change" ? yield* readStageInput(reviewAgent, layout.buildRequest, ImplementRequest) : undefined;
    return { layout, plan, build };
});

/** What a review's finish prints: its decision and the details that go with it. */
export type ReviewOutcome = {
    readonly review: Review;
    readonly outcome: "accepted" | "redo" | "stop";
    /** Why it stopped: a security finding, defects no stage owns, or a review that failed its own check twice. */
    readonly kind?: "security" | "unowned" | "review-check";
    /** The sentence for the operator that goes with the kind. */
    readonly reason?: string;
    /** The plan defects still open when the owners' rounds ran out, accepted with the plan, and what each says. */
    readonly unresolved?: readonly string[];
    readonly unresolvedSaid?: readonly string[];
    /** What the review's own check found in its findings. */
    readonly gaps?: readonly string[];
    /** The stages to run again, in order; empty when the review itself runs again. */
    readonly redo?: readonly string[];
    readonly defects?: readonly string[];
    /** The security findings that stopped it. */
    readonly findings?: readonly string[];
    readonly notes?: number;
    readonly skillProblems: readonly string[];
    /** A passed plan review's implement request, which the operator runs once the approver agrees. */
    readonly implementRequest?: string;
};

/**
 * Writes the reviewer's brief, which lists the files the review reads, and prepares the reviewer's dispatch. It always
 * opens a fresh round, and refuses to run until what the review judges stands accepted.
 * @param runFolder the run's folder
 * @param review which review
 * @returns the dispatch to send
 * Writes: the brief; removes the rejected-findings file unless this is a retry; the round's files. Fails: StageNotAccepted.
 */
export const prepareReview = Effect.fn("ReviewStage.prepareReview")(function* (runFolder: string, review: Review) {
    const { layout, plan, build } = yield* runOf(runFolder, review);
    yield* requireReviewInputs(layout, review);
    const files = layout.review(review);
    const system = yield* System;
    const retry = yield* system.exists(files.feedback);
    const used = yield* roundsUsed(files.folder);
    if (!retry) {
        yield* system.remove(files.rejected);
    }
    const kept = !retry && used > 0 && (yield* system.exists(files.records));
    const earlier = kept ? join(files.folder, "rounds", String(used), "findings.jsonl") : undefined;
    const brief = reviewBrief({ layout, plan }, review, earlier);
    yield* system.writeText(files.brief, JSON.stringify(brief, null, 2));
    return yield* prepareAgent({
        job: review === "plan" ? "plan-review" : "change-review",
        files: { folder: files.folder, output: files.records, handBack: files.handBack, feedback: files.feedback },
        agent: reviewAgent,
        check: checkCommand(reviewAgent, runFolder, review),
        args: {
            codebase: plan.codebase,
            checklistPath: checklistPath(),
            briefPath: files.brief,
            outputPath: files.records,
        },
        approver: approverFeedback(plan.customInstructions, build?.customInstructions ?? ""),
        work: [`your findings, ${files.records}`, `your hand-back, ${files.handBack}`],
        fresh: !retry,
    });
});

/**
 * Sends a review whose findings failed their own check back to the reviewer for one retry, keeping the first try aside.
 * A second failure ends the run with a stop.
 * @param files the review's files
 * @param gaps what the check found wrong
 * @param said what the outcome prints besides
 * @param said.review which review
 * @param said.skillProblems the reviewer's problems with shape-and-deliver itself
 * @returns a redo outcome, or a stop outcome on the second failure
 * Writes: the rejected-findings file; the feedback file.
 */
const sendReviewBack = Effect.fnUntraced(function* (
    files: ReturnType<RunLayout["review"]>,
    gaps: readonly string[],
    said: { readonly review: Review; readonly skillProblems: readonly string[] },
) {
    const system = yield* System;
    if (yield* system.exists(files.rejected)) {
        return {
            ...said,
            outcome: "stop",
            kind: "review-check",
            reason: "the review failed its own check twice",
            gaps,
        } satisfies ReviewOutcome;
    }
    if (yield* system.exists(files.records)) {
        yield* system.writeText(files.rejected, yield* system.readText(files.records));
    } else {
        yield* system.writeText(files.rejected, "");
    }
    yield* writeFeedback(
        files.feedback,
        gaps.map((gap) => new FeedbackItem({ from: "check", said: gap })),
    );
    return { ...said, outcome: "redo", redo: [], gaps } satisfies ReviewOutcome;
});

/**
 * Marks a review accepted after checking that what it judged still stands accepted. A plan review also gets the
 * implement request written; a change review gets the pull request's input.
 * @param review which review
 * @param run the run's layout and plan request
 * @param run.layout the run's layout
 * @param run.plan the plan request
 * @param said what the outcome carries besides
 * @param said.notes how many notes the review left
 * @param said.skillProblems the reviewer's problems with shape-and-deliver itself
 * @returns an accepted outcome, with the implement request path for a plan review
 * Writes: the accepted mark; the implement request for a plan review, `result.json` for a change review.
 */
const acceptReview = Effect.fnUntraced(function* (
    review: Review,
    run: { readonly layout: RunLayout; readonly plan: PlanRequest },
    said: { readonly notes: number; readonly skillProblems: readonly string[] },
) {
    const { layout, plan } = run;
    yield* requireReviewInputs(layout, review);
    yield* markAccepted(layout.review(review).folder);
    if (review === "plan") {
        yield* (yield* System).writeText(layout.implementRequest, approvalMarkerText(plan.codebase, plan.workItemId));
        return {
            review,
            outcome: "accepted",
            ...said,
            implementRequest: layout.implementRequest,
        } satisfies ReviewOutcome;
    }
    yield* (yield* System).writeText(layout.result, JSON.stringify(resultOf(layout, plan), null, 2));
    return { review, outcome: "accepted", ...said } satisfies ReviewOutcome;
});

/**
 * Lists what a finished build hands on, as it is written to the run's `result.json`: the work item, the proof
 * manifest, the orientation, the code decisions and, when the build followed a design, the design's changes.
 * @param layout the run's layout
 * @param plan the plan request
 * @returns the paths, named by what each holds
 */
const resultOf = (layout: RunLayout, plan: PlanRequest) => ({
    workItemPath: layout.workItemMarkdown,
    manifestPath: layout.manifest("afterCode"),
    orientationPath: layout.orient.records,
    decisionsPath: layout.changes.records,
    ...(plan.fromDesign?.changesPath === undefined ? {} : { designDecisionsPath: plan.fromDesign.changesPath }),
});

/**
 * Decides a review that found defects. A plan whose review has used its rounds, or whose defects name an owner with no
 * round left, is accepted with them open. Otherwise they go back to their owners for a redo, and the run stops when no
 * owner is found. A change review whose defects all name a file outside the layers the plan changes is
 * accepted with them open, because only the approver can widen the plan.
 * @param review which review
 * @param run the run's layout and plan request
 * @param run.layout the run's layout
 * @param run.plan the plan request
 * @param found what the review found
 * @param found.defects its defect findings
 * @param found.notes how many findings it wrote
 * @param found.skillProblems the reviewer's problems with shape-and-deliver itself
 * @returns an accepted, redo or stop outcome
 * Writes: the owners' feedback files for a plan, the repair's feedback file for a change; for an accepted plan, the accepted mark and the implement request.
 */
const settleDefects = Effect.fnUntraced(function* (
    review: Review,
    run: { readonly layout: RunLayout; readonly plan: PlanRequest },
    found: {
        readonly defects: readonly RecordOf<"Finding">[];
        readonly notes: number;
        readonly skillProblems: readonly string[];
    },
) {
    const { layout, plan } = run;
    const { skillProblems } = found;
    let defects = found.defects;
    const ids = defects.map((finding) => finding.id);
    const acceptOpen = Effect.fnUntraced(function* () {
        const accepted = yield* acceptReview(review, run, { notes: found.notes - ids.length, skillProblems });
        return { ...accepted, unresolved: ids, unresolvedSaid: found.defects.map(defectLine) } satisfies ReviewOutcome;
    });
    if (review === "plan" && (yield* planReviewSpent(layout, defects))) {
        return yield* acceptOpen();
    }
    if (review === "change") {
        const theirs = yield* defectsForApprover(plan.codebase, layout, defects);
        if (theirs.length === defects.length) {
            return yield* acceptOpen();
        }
        defects = defects.filter((finding) => !theirs.includes(finding));
    }
    const owners: readonly (Owner | "fix")[] = review === "plan" ? yield* routePlanDefects(layout, defects) : ["fix"];
    if (owners.length === 0) {
        return {
            review,
            outcome: "stop",
            kind: "unowned",
            reason: unownedReason(defects),
            defects: ids,
            skillProblems,
        } satisfies ReviewOutcome;
    }
    if (review === "change") {
        yield* writeFeedback(layout.fix.feedback, defects.map(reviewItem));
    }
    const outcome = (yield* outOfRounds(layout, owners)) ? ("stop" as const) : ("redo" as const);
    return { review, outcome, redo: owners, defects: ids, skillProblems } satisfies ReviewOutcome;
});

/**
 * Decides what a review's findings lead to: a retry when its own check fails, a stop on a security finding, the
 * defects' handling when it found any, otherwise acceptance.
 * @param runFolder the run's folder
 * @param review which review
 * @returns the outcome
 */
export const finishReview = Effect.fn("ReviewStage.finishReview")(function* (runFolder: string, review: Review) {
    const system = yield* System;
    const { layout, plan } = yield* runOf(runFolder, review);
    const files = layout.review(review);
    const findings = (yield* system.exists(files.records))
        ? yield* recordsOf(yield* readRecords(files.records), "Finding")
        : undefined;
    const skillProblems = yield* skillProblemsIn(files.records);
    const handBack = yield* handBackGap(files.handBack);
    const gaps = [
        ...(findings === undefined
            ? [`the reviewer wrote nothing to ${files.records}`]
            : yield* reviewGaps(layout, review)),
        ...(handBack === undefined ? [] : [handBack]),
    ];
    if (gaps.length > 0) {
        return yield* sendReviewBack(files, gaps, { review, skillProblems });
    }
    const security = (findings ?? []).filter((finding) => finding.weight === "security");
    const defects = (findings ?? []).filter((finding) => finding.weight === "defect");
    if (security.length > 0) {
        return {
            review,
            outcome: "stop",
            kind: "security",
            reason: "security",
            findings: security.map((finding) => finding.id),
            skillProblems,
        } satisfies ReviewOutcome;
    }
    if (defects.length > 0) {
        return yield* settleDefects(
            review,
            { layout, plan },
            { defects, notes: (findings ?? []).length, skillProblems },
        );
    }
    return yield* acceptReview(review, { layout, plan }, { notes: (findings ?? []).length, skillProblems });
});

/**
 * Prints the review's gaps, or `no gap`, then what no finding names yet. The exit code is 1 when there is a gap.
 * @param input the run folder and which review
 * @returns nothing once printed
 */
const checkReview = Effect.fn("ReviewStage.check")(function* (input: {
    readonly runFolder: string;
    readonly review: Review;
}) {
    const { layout } = yield* runOf(input.runFolder, input.review);
    const gaps = yield* reviewGaps(layout, input.review);
    yield* Console.log(gaps.length === 0 ? "no gap" : gaps.join("\n"));
    const view = yield* reviewView(layout, input.review);
    if (view.length > 0) {
        yield* Console.log(
            [
                "",
                "Not yet written about (each is clean in your judgement, or a finding):",
                ...view.map((line) => `- ${line}`),
            ].join("\n"),
        );
    }
    if (gaps.length > 0) {
        yield* needsAction;
    }
});

const reviewArgument = Argument.Literals("review", ["plan", "change"] as const).pipe(
    Argument.withDescription(
        "Which review: the plan before it is agreed, or the built change before the pull request.",
    ),
);

/**
 * Builds the review command, with its prepare, check, finish and render subcommands. Prepare and finish redraw the
 * run's pages afterwards.
 * @param render the run's render step
 * @returns the command
 */
export const reviewCommand = (render: Render) =>
    Command.make("review-delivery").pipe(
        Command.withDescription(
            "Runs the review of the plan or of the built change by a fresh agent. Prepare writes the brief and prints the dispatch; check prints the gaps in the findings; finish decides the outcome.",
        ),
        Command.withSubcommands([
            Command.make(
                "prepare",
                { runFolder: runFolderArgument, review: reviewArgument },
                Effect.fn("ReviewStage.prepare")(
                    function* (input) {
                        yield* printPrepared(yield* prepareReview(input.runFolder, input.review));
                    },
                    (step, input) => renderAfter(render, input.runFolder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    "Writes the review's brief and prints the reviewer's dispatch. Refused until what it judges stands accepted: every plan stage for the plan; the passed checks after the code commit, and the repair when it ran, for the change.",
                ),
            ),
            Command.make("check", { runFolder: runFolderArgument, review: reviewArgument }, checkReview).pipe(
                Command.withDescription(
                    "Prints each finding that is about no record of this run, or `no gap`, then what no finding names yet. It checks structure only, so passing is necessary, not sufficient. Exit 1 when there is a gap.",
                ),
            ),
            Command.make(
                "finish",
                { runFolder: runFolderArgument, review: reviewArgument },
                Effect.fn("ReviewStage.finish")(
                    function* (input) {
                        yield* printOutcome(yield* finishReview(input.runFolder, input.review));
                    },
                    (step, input) => renderAfter(render, input.runFolder)(step),
                ),
            ).pipe(
                Command.withDescription(
                    `Prints {"outcome": "accepted" | "redo" | "stop"}. Defects go back to their owners, a failed review check gets one retry, and a security finding, defects no stage owns or defects left after ${maxRounds} rounds stop the run, except a plan's, which go to the approver after ${planReviewRounds}. A passed plan review writes implement-request.json.`,
                ),
            ),
            renderCommand(render),
        ]),
    );
