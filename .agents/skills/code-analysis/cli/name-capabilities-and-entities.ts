import { outcomesInWords } from "../shared/jobs/review-report";
import { Console, Effect, Layer, Option } from "effect";
import { refuseWhileBatchOpen } from "../shared/jobs/loop-jobs";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { carryCommand } from "../shared/jobs/carry-command";
import { requestIsCurrent } from "../shared/store/request-guard";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { registeredShapes } from "../shared/model/registered-shapes";
import { carryJob, checkJob } from "../stages/capabilities-and-entities/job-steps";
import { finishStage } from "../stages/capabilities-and-entities/finish";
import { prepareJob, prepareStage } from "../stages/capabilities-and-entities/prepare";
import { capabilitiesAndEntitiesLoop } from "../stages/capabilities-and-entities/capabilities-and-entities-loop";
import { loopCommands, freshFlag, withFresh } from "../shared/jobs/loop-commands";
import { readResourceUses } from "../stages/capabilities-and-entities/units";

/**
 * `prepare`: with no job id, cut the jobs and resume, write the brief and the registries, and print what runs next;
 * with a job id, make that job ready and print its agent and the arguments of the agent and its review.
 * @param jobId the job id, if any
 * @param instructions the person's feedback on the job's last artifact, when they give it
 * @returns the effect that prepares and prints
 */
const prepareStep = Effect.fn("prepareStep")(function* (jobId: string | undefined, instructions: string | undefined) {
    yield* requestIsCurrent();
    const { root } = yield* AnalysisRoot;
    yield* refuseWhileBatchOpen("capabilities-and-entities");
    if (jobId === undefined) {
        const cut = yield* prepareStage(root);
        const over = cut.overBudget
            ? `; ${cut.overBudget} units are larger than a job's budget, each a job alone (tell the person)`
            : "";
        yield* Console.log([`${cut.jobs} jobs${over}; run next to run them`, ...cut.standing].join("\n"));
        return;
    }
    yield* Console.log(JSON.stringify(yield* prepareJob(root, jobId, instructions), null, 2));
});

/**
 * `check`: the stage's gate on one job, with the review's verdicts once the reviewer has written; prints every gap, or
 * `no gap`.
 * @param jobId the job id
 * @returns the effect that checks and prints, marking the run as needing action when there are gaps
 */
const checkStep = Effect.fn("checkStep")(function* (jobId: string) {
    const gaps = yield* checkJob((yield* AnalysisRoot).root, jobId);
    yield* Console.log(gaps.length ? gaps.join("\n") : "no gap");
    if (gaps.length) {
        yield* needsAction;
    }
});

/**
 * `finish`: take what each phase decided (the seeds, the assigning jobs, the merge) and, once the merge is decided,
 * write the stage's accepted records once; prints where the phases stand, the counts, and each job not accepted.
 * @returns the effect that finishes, marking the run as needing action when a job is to be redone
 */
const finishStep = Effect.fn("finishStep")(function* () {
    const { written, outcomes, said } = yield* finishStage((yield* AnalysisRoot).root);
    yield* Console.log([...said, ...(outcomes.length ? [outcomesInWords(outcomes)] : [])].join("\n"));
    for (const each of outcomes.filter((outcome) => outcome.outcome !== "accepted")) {
        yield* Console.log(`${each.job.jobId} ${each.outcome}: ${each.checks.map((item) => item.said).join("; ")}`);
    }
    if (!written) {
        yield* Console.log("no accepted records written; run next, which runs what is still to run");
        yield* needsAction;
        return;
    }
    yield* Console.log("accepted records written");
});

/**
 * `uses`: print every use of one resource and every definition declaring it, each with its lines.
 * @param resource the resource's id, as its job lists it
 * @returns the effect that prints them
 */
const usesStep = Effect.fn("usesStep")(function* (resource: string) {
    yield* Console.log((yield* readResourceUses(resource)).join("\n"));
});

const subcommands = [
    Command.make(
        "prepare",
        {
            jobId: Argument.String("jobId").pipe(Argument.optional),
            instructions: Flag.String("custom-instructions").pipe(Flag.optional),
            fresh: freshFlag,
        },
        ({ jobId, instructions, fresh }) =>
            withFresh(
                "capabilities-and-entities",
                fresh,
                prepareStep(Option.getOrUndefined(jobId), Option.getOrUndefined(instructions)),
            ),
    ).pipe(
        Command.withDescription(
            "With no job id: cuts one proposing job per registry (capabilities, entities), seeded from units across every kind of unit and part, and the jobs assigning every entry point, resource (spellings of one name together) and data shape, in location order and to the budget, the ones the review reads first; keeps each job's id and work while its units are the same; drops the merge's jobs, which the merge cuts again; writes the brief and the registries the jobs read. With a job id: clears that job (an assigning job waits for its registry's proposing job to be decided) and prints its agent and the arguments of the agent and its review, its feedback as customInstructions; --custom-instructions gives the person's feedback on the job's last artifact, refused for a job that produced none. Either way the stage's accepted records are removed until the next finish; refused until the Map has accepted records, and while a batch is open.",
        ),
    ),
    ...loopCommands(capabilitiesAndEntitiesLoop),
    carryCommand("jobId", carryJob),
    Command.make("check", { jobId: Argument.String("jobId") }, ({ jobId }) => checkStep(jobId)).pipe(
        Command.withDescription(
            "The stage's gate on one job: every entry and assignment cites lines in scope, and every cited entry is one of the registry or one the job wrote; an assigning job gives every unit an assignment, names no unit outside the job, and cites lines inside each unit's own lines; a merge job changes the words only of its own slice's entries and merges only written entries, each once; once reviewed, the gate runs again on what the review leaves.",
        ),
    ),
    Command.make("finish", {}, () => finishStep()).pipe(
        Command.withDescription(
            "Takes each phase's decided jobs (the seeds, then the assigning jobs, then the merge, which it begins once every assigning job is decided), sets aside the jobs to redo with their feedback, and once the merge is decided writes the stage's accepted records once: the registries as merged, every assignment, nothing removed for another job's outcome.",
        ),
    ),
    Command.make("uses", { resource: Argument.String("resource") }, ({ resource }) => usesStep(resource)).pipe(
        Command.withDescription(
            "Prints every use of one resource, with its kind and lines, and every data definition declaring it: the evidence a resource job's counts summarise.",
        ),
    ),
];

runScript(
    Command.make("name-capabilities-and-entities").pipe(
        Command.withDescription(
            "Capabilities and entities: assign every entry point, resource and data shape to one entry (the first job of each registry runs alone, then the rest, each writing the entry it needs where none fits), merge the duplicates once in slices, and write the stage's accepted records once.",
        ),
        Command.withSubcommands(subcommands),
    ),
    Layer.mergeAll(rootServices, registeredShapes),
);
