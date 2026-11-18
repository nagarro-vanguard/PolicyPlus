import { dirname } from "node:path";
import { DateTime, Effect, Schema } from "effect";
import { agentOutcomes } from "./policy";
import { about, Text } from "./records";
import { RunInfoInvalid } from "./script-errors";
import { roundsUsed } from "./stage";
import { System } from "./system";
import type { RunLayout } from "./run-layout";

/** The count of tokens or dollars a driver reports: not negative. */
const Amount = Schema.Number.check(Schema.isGreaterThanOrEqualTo(0));

const Outcome = Schema.Literals(agentOutcomes).annotate(
    about(
        "How the agent's run ended: it finished, ran out of time, crashed, or was refused. A driver that says nothing means finished.",
    ),
);

/** What a driver reports of an agent run it knows, in the file `next --after <batch> --run-info <file>` reads. */
export const RunInfo = Schema.Struct({
    model: Schema.optionalKey(Text.annotate(about("The model the agent ran on."))),
    inputTokens: Schema.optionalKey(Amount.annotate(about("The tokens the agent read, in total."))),
    outputTokens: Schema.optionalKey(Amount.annotate(about("The tokens the agent wrote, in total."))),
    costUsd: Schema.optionalKey(Amount.annotate(about("What the run cost, in US dollars."))),
    transcript: Schema.optionalKey(
        Text.annotate(about("A reference to the agent's transcript, as its driver keeps it: an id or a path.")),
    ),
    outcome: Schema.optionalKey(Outcome),
    reason: Schema.optionalKey(Text.annotate(about("Why the run did not finish, in words for the operator."))),
}).annotate(about("What a driver knows of the agent run it closes; every part is optional."));

export type RunInfo = typeof RunInfo.Type;

/**
 * The record of one agent run, written beside the round it closed.
 * @public
 */
export const AgentRun = Schema.Struct({
    batch: Text.annotate(about("The batch the agent ran in.")),
    agent: Text.annotate(about("The agent, by its brief's name.")),
    job: Text.annotate(about("The stage the agent worked for.")),
    brief: Text.annotate(about("The brief the agent's prompt names, an absolute path.")),
    prompt: Text.annotate(about("The prompt the agent was sent, word for word.")),
    startedAt: Schema.optionalKey(Text.annotate(about("When the dispatch was handed out, as an ISO time."))),
    endedAt: Text.annotate(about("When the driver closed the batch, as an ISO time.")),
    ...RunInfo.fields,
    outcome: Outcome,
}).annotate(
    about("What one agent run was: who, for which job, when, how it ended and, if its driver said, at what cost."),
);

export type AgentRun = typeof AgentRun.Type;

/** The batch as `next` records it when it hands out the agent. */
export type OpenedBatch = {
    readonly batch: string;
    readonly job: string;
    readonly startedAt?: string | undefined;
    readonly dispatch: { readonly agent: string; readonly brief: string; readonly prompt: string };
};

/**
 * Reads what a driver reported of a run from its file. Nothing is changed.
 * @param path the `--run-info` file
 * @returns what the file holds
 * Fails: RunInfoInvalid when the file is missing, not JSON, or not in the shape.
 */
export const readRunInfo = Effect.fn("AgentRun.readRunInfo")(function* (path: string) {
    const system = yield* System;
    const text = yield* system
        .readText(path)
        .pipe(Effect.mapError((error) => new RunInfoInvalid({ path, issue: error.message })));
    return yield* Schema.decodeUnknownEffect(Schema.fromJsonString(RunInfo))(text).pipe(
        Effect.mapError((error) => new RunInfoInvalid({ path, issue: error.message })),
    );
});

/**
 * Records the agent run of the batch being closed, in the folder of the round it closed.
 * @param layout the run's layout
 * @param open the batch being closed
 * @param info what the driver reported, if anything
 * @returns nothing
 * Writes: `agent-run.json` in the round's folder.
 */
export const recordAgentRun = Effect.fn("AgentRun.recordAgentRun")(function* (
    layout: RunLayout,
    open: OpenedBatch,
    info: RunInfo | undefined,
) {
    const system = yield* System;
    const folder = dirname(layout.agentRun(open.job, 0));
    const round = yield* roundsUsed(folder);
    const record: AgentRun = {
        batch: open.batch,
        agent: open.dispatch.agent,
        job: open.job,
        brief: open.dispatch.brief,
        prompt: open.dispatch.prompt,
        ...(open.startedAt === undefined ? {} : { startedAt: open.startedAt }),
        endedAt: DateTime.formatIso(yield* DateTime.now),
        ...info,
        outcome: info?.outcome ?? "finished",
    };
    yield* system.writeText(layout.agentRun(open.job, round), JSON.stringify(record, null, 1));
});
