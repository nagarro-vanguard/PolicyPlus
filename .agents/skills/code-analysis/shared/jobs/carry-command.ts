import { Console, Effect } from "effect";
import { Argument, Command } from "effect/cli";
import { AnalysisRoot } from "../run/analysis-root";

type CarriedIdentity = { readonly argument: string; readonly words: string };

const byRecordId: CarriedIdentity = { argument: "recordId", words: "record ids" };

/**
 * What every stage's `carry` does, in the words of the identity its records have.
 * @param identity how the stage's records are named
 * @returns the description
 */
const description = (identity: CarriedIdentity) =>
    `Starts a run from the artifact its feedback is about: copies each of its records into the new output, keeping its identity, except the records whose ${identity.words} are given, which do not stand, so the agent writes only what the feedback changes. Refused on a first run and once the output is written.`;

/**
 * The records left out, named by their identity.
 * @param identity how the stage's records are named
 * @returns the argument
 */
const leftOutOf = (identity: CarriedIdentity) => Argument.String(identity.argument).pipe(Argument.variadic({ min: 0 }));

/**
 * Print what a carry did.
 * @param carried how many records were carried
 * @param left how many were left out
 * @returns the effect that prints it
 */
const printCarried = (carried: number, left: number) => Console.log(`carried ${carried} records, left out ${left}`);

/**
 * `carry <job> [record ids]` for a stage of many jobs: the one wording and output every stage shares (D29).
 * @param job how the stage names a job on its command line, such as `jobId`
 * @param carry the stage's carry, given the analysis root, the job and the record ids left out
 * @returns the subcommand
 */
export const carryCommand = <E, R>(
    job: string,
    carry: (
        root: string,
        job: string,
        leftOut: readonly string[],
    ) => Effect.Effect<{ readonly carried: number; readonly leftOut: number }, E, R>,
) =>
    Command.make("carry", { job: Argument.String(job), leftOut: leftOutOf(byRecordId) }, (args) =>
        Effect.gen(function* () {
            const done = yield* carry((yield* AnalysisRoot).root, args.job, args.leftOut);
            yield* printCarried(done.carried, done.leftOut);
        }),
    ).pipe(Command.withDescription(description(byRecordId)));

/**
 * `carry [record ids]` for one job a stage names by itself (Inventory's, Publish's briefing): the same wording and
 * output as every stage's (D29).
 * @param name the subcommand's name
 * @param carry the job's carry, given the analysis root and the record ids left out
 * @returns the subcommand
 */
export const carryOneJobCommand = <E, R>(
    name: string,
    carry: (
        root: string,
        leftOut: readonly string[],
    ) => Effect.Effect<{ readonly carried: number; readonly leftOut: number }, E, R>,
) =>
    Command.make(name, { leftOut: leftOutOf(byRecordId) }, (args) =>
        Effect.gen(function* () {
            const done = yield* carry((yield* AnalysisRoot).root, args.leftOut);
            yield* printCarried(done.carried, done.leftOut);
        }),
    ).pipe(Command.withDescription(description(byRecordId)));
