import { Console, Effect, Layer, Option } from "effect";
import { refuseWhileBatchOpen } from "../shared/jobs/loop-jobs";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { carryCommand } from "../shared/jobs/carry-command";
import { requestIsCurrent } from "../shared/store/request-guard";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { registeredShapes } from "../shared/model/registered-shapes";
import { carryJob, checkJob, jobNotices } from "../stages/capability-rules/check";
import { gapKinds } from "../shared/jobs/gap-remedies";
import { dropFromJob } from "../stages/capability-rules/drop";
import { finishCapabilityRules, nextAfterFinish } from "../stages/capability-rules/finish";
import { prepareJob, prepareStage } from "../stages/capability-rules/prepare";
import { capabilityRulesLoop } from "../stages/capability-rules/capability-rules-loop";
import { loopCommands, freshFlag, withFresh } from "../shared/jobs/loop-commands";

/**
 * `prepare`: with no job id, choose the capabilities to study (or keep the last choice) and cut the jobs, printing their
 * count and lines; with a job id, make that job ready and print its agent and the arguments of the agent and
 * its review.
 * @param jobId the job id, if any
 * @param capabilities the capabilities named, by name or record id; none keeps the last choice; "all" studies every one
 * @param instructions the person's feedback on the job's last artifact, when they give it
 * @returns the effect that prepares and prints
 */
const prepareStep = Effect.fn("prepareStep")(function* (
    jobId: string | undefined,
    capabilities: readonly string[] | "all",
    instructions: string | undefined,
) {
    yield* requestIsCurrent();
    const { root } = yield* AnalysisRoot;
    yield* refuseWhileBatchOpen("capability-rules");
    if (jobId === undefined) {
        const cut = yield* prepareStage(root, capabilities);
        const over = cut.overBudget
            ? `; ${cut.overBudget} pieces of code are larger than a job's budget, each a job alone`
            : "";
        const unkept = cut.unkept.length
            ? `; ${cut.unkept.length} resources they save are kept by no kind of data, so they have no life to read (tell the person): ${cut.unkept.join(", ")}`
            : "";
        const refused = cut.refusedMapJobs
            ? `; the Map refused ${cut.refusedMapJobs} jobs, so rules in their lines go unread`
            : "";
        yield* Console.log(
            `studying ${cut.capabilities.join(", ")}: ${cut.lifecycleJobs} lifecycle jobs and ${cut.rulesJobs} rules jobs over ${cut.lines} lines${over}${refused}${unkept}; then run next`,
        );
        return;
    }
    yield* Console.log(JSON.stringify(yield* prepareJob(root, jobId, instructions), null, 2));
});

/**
 * `check`: the stage's gate on one job, with the review's verdicts once the reviewer has written; prints every gap, or
 * `no gap`, then the rules to read again that are no gap (long, or hinting at a second decision).
 * @param jobId the job id
 * @returns the effect that checks and prints, marking the run as needing action when there are gaps
 */
const checkStep = Effect.fn("checkStep")(function* (jobId: string) {
    const { root } = yield* AnalysisRoot;
    const gaps = yield* checkJob(root, jobId);
    yield* Console.log(gaps.length ? gaps.join("\n") : "no gap");
    for (const notice of yield* jobNotices(root, jobId)) {
        yield* Console.log(`to read again (not a gap): ${notice}`);
    }
    if (gaps.length) {
        yield* needsAction;
    }
});

/**
 * `drop-record`: remove one record from a job's output, keeping its text and why for the review.
 * @param jobId the job id
 * @param recordId the record to drop
 * @param why why it goes
 * @returns the effect that drops and prints
 */
const dropStep = Effect.fn("dropStep")(function* (jobId: string, recordId: string, why: string) {
    const drop = yield* dropFromJob((yield* AnalysisRoot).root, jobId, recordId, why);
    yield* Console.log(`dropped ${drop.id}`);
});

/**
 * `finish`: decide the lives, then the rules, and write the stage's accepted records once both are decided; prints
 * each outcome and what happens next.
 * @returns the effect that finishes, marking the run as needing action until the records are written
 */
const finishStep = Effect.fn("finishStep")(function* () {
    const decision = yield* finishCapabilityRules((yield* AnalysisRoot).root);
    yield* Console.log(nextAfterFinish(decision).said.join("\n"));
    if (!decision.written) {
        yield* needsAction;
    }
});

const subcommands = [
    Command.make(
        "prepare",
        {
            jobId: Argument.String("jobId").pipe(Argument.optional),
            capabilities: Flag.String("capability").pipe(Flag.atLeast(0)),
            all: Flag.Boolean("all").pipe(Flag.withDefault(false)),
            instructions: Flag.String("custom-instructions").pipe(Flag.optional),
            fresh: freshFlag,
        },
        ({ jobId, capabilities, all, instructions, fresh }) =>
            withFresh(
                "capability-rules",
                fresh,
                prepareStep(
                    Option.getOrUndefined(jobId),
                    all ? "all" : capabilities,
                    Option.getOrUndefined(instructions),
                ),
            ),
    ).pipe(
        Command.withDescription(
            "With no job id: takes the capabilities to study, each as --capability \"<name>\" (its name as the overview shows it, or its record id where two share one), or every capability with --all, or keeps the last choice, each as the capability standing for it now (itself, or the one that merged it; refused, naming it, when neither stands); cuts one lifecycle job per entity they save, holding every place the whole system saves it, and the rules jobs over the blocks their entry points reach, to the read budget; keeps each unchanged job's id and work; writes the brief; prints the jobs' count and the lines. With a job id: clears that job (a rules job waits until every life is decided; a lifecycle job run again clears the rules jobs whose output gates one of its transitions) and prints its agent and the arguments of the agent and its review, its feedback as customInstructions; --custom-instructions gives the person's feedback on the job's last artifact, refused for a job that produced none. Either way the stage's accepted records are removed until the next finish; refused until Capabilities and entities has accepted records, while Publish has, and while a batch is open.",
        ),
    ),
    ...loopCommands(capabilityRulesLoop),
    carryCommand("jobId", carryJob),
    Command.make("check", { jobId: Argument.String("jobId") }, ({ jobId }) => checkStep(jobId)).pipe(
        Command.withDescription(
            "The stage's gate on one job, printing what is not yet accounted for: a lifecycle job writes one life, of its entity, whose transitions name its states; a rules job decides each rule inside a block of the job and gates only accepted transitions; the job's output ends with one receipt covering the job's lines (for a lifecycle job, its saves' lines); every record cites lines in scope; once reviewed, every finding given one verdict that looked at its lines. Each gap says what is wrong and what to do; its kind is one of " +
                gapKinds.join(", ") +
                ". Necessary, not sufficient.",
        ),
    ),
    Command.make(
        "drop-record",
        { jobId: Argument.String("jobId"), recordId: Argument.String("recordId"), why: Flag.String("why") },
        ({ jobId, recordId, why }) => dropStep(jobId, recordId, why),
    ).pipe(
        Command.withDescription(
            "Removes one record from a job's output, before its review: every copy of it goes, and its text and why are kept in the job's drops, which the next review is handed. Refused for a record the output does not hold, once the job is reviewed, and while a record of any job's output cites it.",
        ),
    ),
    Command.make("finish", {}, () => finishStep()).pipe(
        Command.withDescription(
            "Decides the lives by their reviews, setting aside those owed their one fix; once every life is decided, decides the rules jobs; writes the stage's accepted records once both are decided, in one commit: the accepted lives, transitions, rules and facts, never a receipt. A refused job's capability reads incomplete on its page. Re-checks against today's brief and cut.",
        ),
    ),
];

runScript(
    Command.make("explain-capability-rules").pipe(
        Command.withDescription(
            "Capability rules: for the capabilities the person chooses, read the life of every entity they change across the whole system, then every rule their code decides, each reviewed, and finish by writing the stage's accepted records once.",
        ),
        Command.withSubcommands(subcommands),
    ),
    Layer.mergeAll(rootServices, registeredShapes),
);
