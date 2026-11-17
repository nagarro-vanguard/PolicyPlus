import { Schema } from "effect";
import { Text, about } from "../shared-fields";

const Dispatch = Schema.Struct({
    job: Text.annotate(about("The job, as its stage names it.")),
    agent: Text.annotate(about("The agent to run, as `<stage folder>/<name>`.")),
    brief: Text.annotate(about("The agent's brief, an absolute path.")),
    arguments: Schema.Record(
        Schema.String,
        Schema.String.annotate(about("One named argument's value, as the prompt gives it.")),
    ).annotate(about("The agent's named arguments, as the prompt gives them, for a runner that reads them.")),
    prompt: Text.annotate(about("What to send the agent, word for word: its brief and its named arguments.")),
}).annotate(about("One agent to run now."));

export const AssumptionNotice = Schema.Struct({
    job: Text.annotate(about("The job whose agent wrote it, as its stage names it.")),
    fact: Schema.optionalKey(Text).annotate(
        about(
            "The assumption's record id, the handle for `challenge` and `attach`; absent while the stage has not written it yet (the Map writes its own once every job is decided, and the register then shows its id).",
        ),
    ),
    statement: Text.annotate(about("What is assumed.")),
    why: Text.annotate(about("Why no file settles it.")),
    ifWrong: Text.annotate(about("What changes if it is wrong.")),
}).annotate(
    about(
        "One assumption an agent wrote, for the person to see as soon as its batch closes (D66, D165): the register holds every one, and the person's word goes in through `challenge`, `attach` or `accept-assumptions`.",
    ),
);

const assumptions = Schema.Array(AssumptionNotice).annotate(
    about("The assumptions the jobs of the batch just closed wrote, for the driver to give the person at once."),
);

export const StageActions = Schema.Union([
    Schema.Struct({
        next: Schema.Literal("dispatch").annotate(about("The action: run these agents now.")),
        batch: Text.annotate(about("The batch these agents form; close it with `next --after <batch>`.")),
        dispatch: Schema.NonEmptyArray(Dispatch).annotate(about("The agents to run in parallel, each once.")),
        assumptions,
    }).annotate(about("Run these agents, in parallel, as one batch.")),
    Schema.Struct({
        next: Schema.Literal("wait").annotate(about("The action: wait for the open batch.")),
        batch: Text.annotate(about("The open batch.")),
        said: Text.annotate(about("What to tell the person while the batch is open, in plain words.")),
        assumptions,
    }).annotate(about("A batch is still open: its agents have not all reported.")),
    Schema.Struct({
        next: Schema.Literal("done").annotate(about("The action: the stage's loop is over.")),
        said: Schema.Array(Text).annotate(about("What the stage tells the person at its end, one line each.")),
        assumptions,
    }).annotate(about("The stage has nothing more to run.")),
    Schema.Struct({
        next: Schema.Literal("stop").annotate(about("The action: stop, because a step refused.")),
        said: Text.annotate(about("Why the stage stopped, and what the person can do, in plain words.")),
        assumptions,
    }).annotate(about("A step refused, so the loop stops here.")),
]).annotate(
    about(
        "What a stage's `next` hands its driver: agents to run in parallel as one batch, a wait while a batch is open, the end of the stage's loop, or a step that refused.",
    ),
);

export type StageActions = typeof StageActions.Type;

export type Dispatch = typeof Dispatch.Type;

export type AssumptionNotice = typeof AssumptionNotice.Type;
