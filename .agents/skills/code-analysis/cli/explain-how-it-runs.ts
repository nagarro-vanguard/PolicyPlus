import { Console, Effect, Layer, Option } from "effect";
import { refuseWhileBatchOpen } from "../shared/jobs/loop-jobs";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { carryCommand } from "../shared/jobs/carry-command";
import { requestIsCurrent } from "../shared/store/request-guard";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { registeredShapes } from "../shared/model/registered-shapes";
import { carryStudy, checkJob } from "../stages/how-it-runs/check-study";
import { finishStudy, nextAfterFinish } from "../stages/how-it-runs/finish-study";
import { requestContext } from "../stages/how-it-runs/study-arguments";
import { listedJobNamed, prepareJob, prepareStage } from "../stages/how-it-runs/study-jobs";
import { howItRunsConclusions, howItRunsLoop } from "../stages/how-it-runs/how-it-runs-loop";
import { loopCommands, freshFlag, withFresh } from "../shared/jobs/loop-commands";
import { stageAuditKey } from "../shared/jobs/stage-audit";
import { checkStageAudit } from "../stages/how-it-runs/audit-stage";

/**
 * How it runs' concluding jobs, for the analysis root this run works in.
 * @returns the steps
 */
const concluding = Effect.fnUntraced(function* () {
    const { root } = yield* AnalysisRoot;
    return howItRunsConclusions(root, (yield* requestContext(root)).sourceFolder);
});

/**
 * `prepare`: list a study for every technology and group of its parts, clearing none; or, given a study or a
 * concluding job, make it ready to run afresh and print its agent's arguments; or, given the stage audit, write the
 * stage's accepted facts for it and print its validator's arguments.
 * @param name the job to make ready, by its key; none to list every study
 * @param instructions the person's feedback on the named job's last output, when they give it
 * @returns the effect that prepares and prints
 */
const prepareStep = Effect.fn("prepareStep")(function* (name: string | undefined, instructions: string | undefined) {
    yield* requestIsCurrent();
    const { root } = yield* AnalysisRoot;
    yield* refuseWhileBatchOpen("how-it-runs");
    if (name === undefined) {
        const list = yield* prepareStage(root);
        yield* Console.log(
            `${list.length} studies: ${list.map((job) => `${job.jobId} (${job.name})`).join(", ")}; run next to run them`,
        );
        return;
    }
    const conclusions = yield* concluding();
    const prepared = (yield* conclusions.isConcluding(name))
        ? yield* conclusions.prepare(name, instructions)
        : yield* prepareJob(root, name, instructions);
    yield* Console.log(JSON.stringify(prepared, null, 2));
});

/**
 * `check`: How it runs' gate on one study, concluding job or the stage audit, with the review's verdicts once the
 * reviewer has written; prints every gap, or `no gap`.
 * @param name the job, by its key
 * @returns the effect that checks and prints, marking the run as needing action when there are gaps
 */
const checkStep = Effect.fn("checkStep")(function* (name: string) {
    const { root } = yield* AnalysisRoot;
    const conclusions = yield* concluding();
    const gaps =
        name === stageAuditKey
            ? yield* checkStageAudit(root)
            : (yield* conclusions.isConcluding(name))
              ? yield* conclusions.check(name)
              : yield* checkJob(root, yield* listedJobNamed(root, name));
    yield* Console.log(gaps.length ? gaps.join("\n") : "no gap");
    if (gaps.length) {
        yield* needsAction;
    }
});

/**
 * `finish`: decide the studies, then the concluding jobs, and write How it runs' accepted facts once none is to redo
 * or to run; prints each outcome.
 * @returns the effect that finishes, marking the run as needing action until the records are written
 */
const finishStep = Effect.fn("finishStep")(function* () {
    const decision = yield* finishStudy((yield* AnalysisRoot).root);
    const next = nextAfterFinish(decision);
    yield* Console.log(next.said.join("\n"));
    if (!decision.written) {
        yield* needsAction;
    }
});

const jobKey = Argument.String("job");

const subcommands = [
    Command.make(
        "prepare",
        {
            name: jobKey.pipe(Argument.optional),
            instructions: Flag.String("custom-instructions").pipe(Flag.optional),
            fresh: freshFlag,
        },
        ({ name, instructions, fresh }) =>
            withFresh(
                "how-it-runs",
                fresh,
                prepareStep(Option.getOrUndefined(name), Option.getOrUndefined(instructions)),
            ),
    ).pipe(
        Command.withDescription(
            "With no job: lists a study for every framework and platform and group of the parts it runs, clears no study, and clears the concluding jobs, which the next finish lists afresh. With a study's key: clears that study, review and report, records it against today's technologies, takes --custom-instructions as the person's feedback on its last study (refused before it produced one), and prints its study's and review's arguments. With a concluding job's key: clears its answers, review and report and prints its agent's arguments. Either way How it runs' accepted records are removed until the next finish; refused while the Map has accepted records, and while a batch is open.",
        ),
    ),
    ...loopCommands(howItRunsLoop),
    carryCommand("job", (root, name, leftOut) =>
        Effect.gen(function* () {
            const conclusions = howItRunsConclusions(root, (yield* requestContext(root)).sourceFolder);
            return (yield* conclusions.isConcluding(name))
                ? yield* conclusions.carry(name, leftOut)
                : yield* carryStudy(root, yield* listedJobNamed(root, name), leftOut);
        }),
    ),
    Command.make("check", { name: jobKey }, ({ name }) => checkStep(name)).pipe(
        Command.withDescription(
            "How it runs' gate on one study or concluding job: every fact about a subject the job may name, answering a question of the catalogue, citing lines in scope that hold what it names; a concluding job's answers once per topic, resting only on the facts beneath; once reviewed, every finding given one verdict that looked at its lines. Necessary, not sufficient.",
        ),
    ),
    Command.make("finish", {}, () => finishStep()).pipe(
        Command.withDescription(
            "Decides the studies by their reviews, setting aside those to redo; once none is, lists the concluding jobs the facts call for, the parts' tier then the system's, and decides each by its review; once none runs, writes How it runs' accepted facts in one commit. Re-checks against today's technologies, parts and manifest.",
        ),
    ),
];

runScript(
    Command.make("explain-how-it-runs").pipe(
        Command.withDescription(
            "How it runs: study every framework and platform side by side over the parts it runs, each reviewed, then conclude the topics the studies leave with several facts, and finish by writing How it runs' accepted facts once. It writes no model of the system: the Map's registries hold the code kinds and external systems.",
        ),
        Command.withSubcommands(subcommands),
    ),
    Layer.mergeAll(rootServices, registeredShapes),
);
