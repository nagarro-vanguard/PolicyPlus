import { outcomesInWords } from "../shared/jobs/review-report";
import { Console, Effect, Layer, Option } from "effect";
import { refuseWhileBatchOpen } from "../shared/jobs/loop-jobs";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { carryCommand } from "../shared/jobs/carry-command";
import { requestIsCurrent } from "../shared/store/request-guard";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { registeredShapes } from "../shared/model/registered-shapes";
import { finishMap, reachSummary } from "../stages/map/finish-map";
import { mapReports } from "../stages/map/map-reports";
import { prepareMapJobs, type MapTarget } from "../stages/map/map-jobs";
import { carryAnyMapJob, checkAnyMapJob } from "../stages/map/map-job-steps";
import { prepareMap } from "../stages/map/map-prepare";
import { mapLoop } from "../stages/map/map-loop";
import { loopCommands, freshFlag, withFresh } from "../shared/jobs/loop-commands";

/**
 * `prepare`: with no target, cut the jobs and resume, clearing none, and print their count and lines; with a
 * job id, make that job ready and print its two agents' arguments; with `--path`, make every job under the path ready
 * to run again and print how many.
 * @param target the job id or the path, if any
 * @param instructions the person's feedback on the jobs' last artifacts, when they give it
 * @returns the effect that prepares and prints
 */
const prepareStep = Effect.fn("prepareStep")(function* (
    target: MapTarget | undefined,
    instructions: string | undefined,
) {
    yield* requestIsCurrent();
    const { root } = yield* AnalysisRoot;
    yield* refuseWhileBatchOpen("map");
    if (target === undefined) {
        const cut = yield* prepareMap(root);
        yield* Console.log(
            [
                `${cut.jobs} map jobs, ${cut.lines} lines; ${cut.lead} runs first, alone, since it holds the most kinds of file and parts, and the registries grow from what the jobs write; then run next`,
                ...(cut.rulesNotGot.length
                    ? [
                          `rules How it runs has not got, which the Map's jobs will work without: ${cut.rulesNotGot.length}`,
                          ...cut.rulesNotGot.map((rule) => `  ${rule}`),
                      ]
                    : []),
            ].join("\n"),
        );
        return;
    }
    const prepared = yield* prepareMapJobs(root, target, instructions);
    yield* Console.log(
        target.kind === "jobs"
            ? JSON.stringify(prepared[0], null, 2)
            : `${prepared.length} jobs cleared to run again; run next`,
    );
});

/**
 * `check`: the Map's gate on one job, with the review's verdicts once the reviewer has written; prints every gap, or
 * `no gap`.
 * @param jobId the job id
 * @returns the effect that checks and prints, marking the run as needing action when there are gaps
 */
const checkStep = Effect.fn("checkStep")(function* (jobId: string) {
    const gaps = yield* checkAnyMapJob((yield* AnalysisRoot).root, jobId);
    yield* Console.log(gaps.length ? gaps.join("\n") : "no gap");
    if (gaps.length) {
        yield* needsAction;
    }
});

/**
 * `finish`: decide every job's review outcome, check the accepted jobs across jobs, and write the Map's accepted
 * records once;
 * prints the counts, each job to run again with its feedback, and the blocks no entry point reaches.
 * @returns the effect that finishes, marking the run as needing action when a job is to be fixed
 */
const finishStep = Effect.fn("finishStep")(function* () {
    const { written, outcomes, reach, said } = yield* finishMap((yield* AnalysisRoot).root);
    for (const line of said) {
        yield* Console.log(line);
    }
    yield* Console.log(outcomesInWords(outcomes));
    for (const each of outcomes.filter((outcome) => outcome.outcome !== "accepted")) {
        yield* Console.log(`${each.job.jobId} ${each.outcome}: ${each.checks.map((item) => item.said).join("; ")}`);
    }
    if (!written) {
        yield* Console.log("no accepted records written; run next, which hands out each job to fix");
        yield* needsAction;
        return;
    }
    yield* Console.log(reachSummary(reach));
    for (const line of yield* mapReports((yield* AnalysisRoot).root)) {
        yield* Console.log(line);
    }
});

const subcommands = [
    Command.make(
        "prepare",
        {
            jobId: Argument.String("jobId").pipe(Argument.optional),
            path: Flag.String("path").pipe(Flag.optional),
            instructions: Flag.String("custom-instructions").pipe(Flag.optional),
            fresh: freshFlag,
        },
        ({ jobId, path, instructions, fresh }) =>
            withFresh(
                "map",
                fresh,
                prepareStep(
                    Option.isSome(jobId)
                        ? { kind: "jobs", jobIds: [jobId.value] }
                        : Option.isSome(path)
                          ? { kind: "path", path: path.value }
                          : undefined,
                    Option.getOrUndefined(instructions),
                ),
            ),
    ).pipe(
        Command.withDescription(
            "With no target: cuts every file in scope into jobs by folder and the read budget, keeps each unchanged job's id and work, picks the lead job, the one holding the most kinds of file and parts, which runs first and alone, writes the stage's brief, prints the jobs' count and lines, and clears none. With a job id (a proposing job's or a Map job's): clears that job, writes a Map job's own brief (the facts on the parts and technologies its lines touch), and prints its agent's and review's arguments. With --path <path>: clears every job holding a file under the path (. for all). Each job's feedback is printed as its agents' customInstructions; --custom-instructions gives the person's feedback on the named jobs' last artifacts, refused for jobs that produced none. Either way the Map's accepted records are removed until the next finish; refused until How it runs has accepted records, while Capabilities and entities has, and while a batch is open.",
        ),
    ),
    ...loopCommands(mapLoop),
    carryCommand("jobId", carryAnyMapJob),
    Command.make("check", { jobId: Argument.String("jobId") }, ({ jobId }) => checkStep(jobId)).pipe(
        Command.withDescription(
            "The Map's gate on one job. A proposing job: its entries in scope, each named once, every layer holding a code kind, no entry the Map's jobs stand on dropped or redefined, and each merge of an entry a Map job wrote. A Map job: cited lines and link targets lie in files of the manifest; every record starts in one of the job's windows; no two blocks partly overlap or sit on the same lines; every non-blank line of its windows lies in a block, a data definition, a span or an `Unread` line; every id it cites resolves; once reviewed, the review's structure (each challenge names a record and cites lines, each `Missed` is placed in the job's windows) and its receipt, which must cover every non-blank line of the windows.",
        ),
    ),
    Command.make("finish", {}, () => finishStep()).pipe(
        Command.withDescription(
            "Decides what was decided since; once every Map job is decided, gives the proposing jobs the entries the Map's jobs wrote, to merge. Once they have merged them, applies every review, re-checks against today's manifest and rules, checks the accepted jobs across jobs in the record store (links resolved, gaps across jobs sent to every job they name), sets aside the jobs owed their one fix with their feedback, or writes the registries, the entries written while mapping, the map with its review labels and the Map's assumptions (per part and kind, for what it cannot see) once.",
        ),
    ),
];

runScript(
    Command.make("map-codebase").pipe(
        Command.withDescription(
            "The Map: cut the code into jobs, map and review each job, the lead job first and alone, each choosing from the two registries (code kinds, external systems) and writing the entry it needs where none fits, merge the duplicates once every job is decided, check them, and finish by joining them and writing the registries and the map once.",
        ),
        Command.withSubcommands(subcommands),
    ),
    Layer.mergeAll(rootServices, registeredShapes),
);
