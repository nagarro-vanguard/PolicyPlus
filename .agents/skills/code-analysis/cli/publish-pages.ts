import { UsageInvalid } from "../shared/run/script-errors";
import { Console, Effect, Layer, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { carryCommand } from "../shared/jobs/carry-command";
import { refuseWhileBatchOpen } from "../shared/jobs/loop-jobs";
import { loopCommands, freshFlag, withFresh } from "../shared/jobs/loop-commands";
import { requestIsCurrent } from "../shared/store/request-guard";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { registeredShapes } from "../shared/model/registered-shapes";
import { briefingContext, briefingLabel, carryBriefing, prepareBriefing } from "../stages/publish/briefing-job";
import { checkBriefing } from "../stages/publish/check-briefing";
import { finishBriefing } from "../stages/publish/finish-briefing";
import { publishConclusions, publishLoop } from "../stages/publish/publish-loop";

/**
 * Publish's concluding jobs, for the analysis root this run works in.
 * @returns the steps
 */
const concluding = Effect.fnUntraced(function* () {
    const { root } = yield* AnalysisRoot;
    return publishConclusions(root, (yield* briefingContext(root)).sourceFolder);
});

/**
 * Which of Publish's jobs a key names (D226): none, or the briefing's label, names the briefing; a concluding job's key
 * names it; any other key is refused, so a mistyped key never clears the briefing.
 * @param job the key given, if any
 * @returns which job it names; UsageInvalid for a key naming none
 */
const jobNamed = Effect.fnUntraced(function* (job: string | undefined) {
    if (job === undefined || job === briefingLabel) {
        const named: "briefing" | "concluding" = "briefing";
        return named;
    }
    if (yield* (yield* concluding()).isConcluding(job)) {
        const named: "briefing" | "concluding" = "concluding";
        return named;
    }
    return yield* new UsageInvalid({
        issue: `"${job}" names none of Publish's jobs: give no key, or "${briefingLabel}", for the briefing, or a concluding job's key as status lists it`,
    });
});

/**
 * `prepare`: make the briefing, or a concluding job named by its key, ready for its next run and print its agent's
 * named arguments, the feedback last.
 * @param job the concluding job's key; none for the briefing
 * @param words the person's feedback on the job's last output, when they give it
 * @returns the effect that prepares it
 */
const prepareStep = Effect.fn("prepareStep")(function* (job: string | undefined, words: string | undefined) {
    yield* requestIsCurrent();
    const { root } = yield* AnalysisRoot;
    yield* refuseWhileBatchOpen("publish");
    const conclusions = yield* concluding();
    const prepared =
        (yield* jobNamed(job)) === "concluding"
            ? yield* conclusions.prepare(String(job), words)
            : yield* prepareBriefing(root, words);
    yield* Console.log(JSON.stringify(prepared, null, 2));
});

/**
 * `check`: the gate on the briefing, or on a concluding job named by its key, and its review's verdicts once written,
 * printing each gap, or `no gap`.
 * @param job the concluding job's key; none for the briefing
 * @returns the effect that checks; the run must act when there is a gap
 */
const checkStep = Effect.fn("checkStep")(function* (job: string | undefined) {
    const { root } = yield* AnalysisRoot;
    const conclusions = yield* concluding();
    const gaps =
        (yield* jobNamed(job)) === "concluding" ? yield* conclusions.check(String(job)) : yield* checkBriefing(root);
    yield* Console.log(gaps.length ? gaps.join("\n") : "no gap");
    if (gaps.length) {
        yield* needsAction;
    }
});

/**
 * `finish`: decide the briefing, then the concluding jobs, and write Publish's records once none is to fix or run.
 * @returns the effect that finishes, marking the run as needing action until the records are written
 */
const finishStep = Effect.fn("finishStep")(function* () {
    const decision = yield* finishBriefing((yield* AnalysisRoot).root);
    yield* Console.log(`the briefing: ${decision.briefing.outcome}`);
    if (decision.concluding) {
        yield* Console.log("the topics every stage's facts leave open are concluded next: run next");
    }
    if (!decision.written) {
        yield* needsAction;
    }
});

const jobKey = Argument.String("job").pipe(Argument.optional);

const subcommands = [
    Command.make(
        "prepare",
        { job: jobKey, words: Flag.String("custom-instructions").pipe(Flag.optional), fresh: freshFlag },
        ({ job, words, fresh }) =>
            withFresh("publish", fresh, prepareStep(Option.getOrUndefined(job), Option.getOrUndefined(words))),
    ).pipe(
        Command.withDescription(
            "With no job: writes the briefing's brief from the capability view every page reads (each capability holding an entry point, with who starts its entry points, what they do, its parts, what it keeps, what it reaches, and the capabilities sharing its kinds of data); then clears the briefing's output, review and report, removes Publish's accepted records, and prints the agents' named arguments; --custom-instructions gives the person's feedback on the last briefing (refused before one was written). With a concluding job's key: clears its answers and prints its agent's arguments. Refused until Capabilities and entities has accepted records, and while a batch is open.",
        ),
    ),
    ...loopCommands(publishLoop),
    carryCommand("job", (root, job, leftOut) =>
        Effect.gen(function* () {
            const conclusions = yield* concluding();
            return (yield* jobNamed(job)) === "concluding"
                ? yield* conclusions.carry(job, leftOut)
                : yield* carryBriefing(root, leftOut);
        }),
    ),
    Command.make("check", { job: jobKey }, ({ job }) => checkStep(Option.getOrUndefined(job))).pipe(
        Command.withDescription(
            "The gate on the briefing (every capability of the brief in exactly one area; its facts held to the facts' rules), or on a concluding job named by its key (each topic answered once, resting only on the facts beneath); once reviewed, every finding given one verdict that looked at its lines. Necessary, not sufficient.",
        ),
    ),
    Command.make("finish", {}, () => finishStep()).pipe(
        Command.withDescription(
            "Applies the briefing's review, setting it aside for its one fix or refusing it while its checks still fail; then lists the concluding jobs every stage's facts call for, in tiers, and decides each; once none is to fix or run, writes the areas and the conclusions in one transaction.",
        ),
    ),
];

runScript(
    Command.make("publish-pages").pipe(
        Command.withDescription(
            "Publish: the last pass over the subject pages. Its briefing groups the capabilities into areas, reviewed; then every topic the stages' facts leave open is concluded, the system's overview last.",
        ),
        Command.withSubcommands(subcommands),
    ),
    Layer.mergeAll(rootServices, registeredShapes),
);
