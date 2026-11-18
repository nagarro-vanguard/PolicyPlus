import { Schema } from "effect";
import { about } from "./annotations";
import { Tags } from "./workflows";

const Text = Schema.String.check(Schema.isMinLength(1));

export const Dispatch = Schema.Struct({
    job: Text.annotate(about("The stage the agent works for, as the run names it.")),
    agent: Text.annotate(about("The agent, by its brief's name.")),
    brief: Text.annotate(about("The agent's brief, an absolute path.")),
    arguments: Schema.Record(Schema.String, Schema.String).annotate(
        about("The agent's named arguments, as the prompt gives them, for a driver that reads them."),
    ),
    prompt: Text.annotate(about("What to send the agent, word for word: its brief and its named arguments.")),
}).annotate(about("One agent to run now, in a context of its own."));

export type Dispatch = typeof Dispatch.Type;

const forReader = Schema.optionalKey(
    Text.annotate(
        about(
            "What to put to the person, in one or two plain sentences and one page to open: never a path, a command or an agent's name. `said` is for the driver; this is for the person.",
        ),
    ),
);

const open = Schema.optionalKey(
    Text.annotate(about("The one page the person opens now, as an absolute path to show as a link.")),
);

const tell = Schema.Array(Text).annotate(
    about(
        "What the operator must hear now, one line each: a stage that finished, the gaps a stage was sent back with, the agents' problems with the skill itself, and the questions a stop waits on. No page carries them.",
    ),
);

export const RunActions = Schema.Union([
    Schema.Struct({
        next: Schema.Literal("dispatch"),
        batch: Text.annotate(about("The batch this agent forms; close it with `next --after <batch>`.")),
        dispatch: Schema.Tuple([Dispatch]),
        tell,
    }),
    Schema.Struct({
        next: Schema.Literal("wait"),
        batch: Text.annotate(about("The open batch.")),
        dispatch: Schema.Tuple([Dispatch]).annotate(
            about(
                "The agent the open batch handed out: run it in a context of its own when none is running for the batch, then close the batch.",
            ),
        ),
        startedAt: Schema.optionalKey(Text.annotate(about("When the batch was handed out."))),
        said: Text,
        tell,
    }),
    Schema.Struct({
        next: Schema.Literal("done"),
        said: Schema.Array(Text),
        forReader,
        open,
        implementRequest: Schema.optionalKey(
            Text.annotate(about("Present when a plan is done: its approval marker, which a build needs.")),
        ),
        retag: Schema.optionalKey(
            Schema.Struct({
                remove: Tags,
                add: Tags,
                comment: Text.annotate(about("What to say to the people waiting, in a comment on the work item.")),
            }).annotate(
                about(
                    "Present when the run's end changes the work item's tags: apply it to the work item as the root AGENTS.md says, and post the comment.",
                ),
            ),
        ),
        tell,
    }),
    Schema.Struct({ next: Schema.Literal("stop"), said: Text, forReader, open, tell }),
]).annotate(
    about(
        "What `next` hands its driver: one agent to run, a wait while a batch is open, the end of the mode's stages, or a stop the operator must act on.",
    ),
);

export type RunActions = typeof RunActions.Type;

/** The one agent a `dispatch` action hands its driver. */
export type Dispatched = Dispatch;
