import { Schema } from "effect";
import { Text, about } from "../shared-fields";

const Id = Schema.String.check(Schema.isMinLength(1));

const JourneyStepPayload = Schema.Struct({
    intent: Text.annotate(about("What the person is trying to get done in this step, in the words of the business.")),
    system: Text.annotate(about("What the system does in response.")),
    from: Schema.Array(Id)
        .check(Schema.isMinLength(1))
        .annotate(about("The entry points that make up this step, by record id.")),
    confidence: Schema.Literals(["sure", "inferred"]).annotate(
        about("`sure` when the code states it, `inferred` when it was concluded from the code."),
    ),
}).annotate(about("One step of how a task is done today."));

export const TaskPayload = Schema.Struct({
    id: Text.annotate(
        about(
            "The task's stable id: the capability's name and the task's name, as `<capability-slug>.<task-slug>`; unique in the file.",
        ),
    ),
    outcome: Text.annotate(
        about("What the person gets done, one sentence in the business's words, naming no control, page or medium."),
    ),
    actor: Text.annotate(about("Who does it: a role of the business, or `person` when nothing says more.")),
    actions: Schema.Array(Id)
        .check(Schema.isMinLength(1))
        .annotate(about("Every entry point the task is made of, by record id; each belongs to exactly one task.")),
    rules: Schema.Array(Id).annotate(
        about("The ids of the business rules decided by those entry points; each belongs to exactly one task."),
    ),
    facts: Schema.Array(Id).annotate(about("The ids of the kinds of data the task reads or changes.")),
    needs: Schema.Array(Id).annotate(about("The ids of the outside systems the task reaches.")),
    current: Schema.Array(JourneyStepPayload)
        .check(Schema.isMinLength(1))
        .annotate(about("How the task is done today, in order, each step citing its entry points.")),
}).annotate(about("A task people do with the system: an outcome, not a screen."));

export const JourneysPayload = Schema.Struct({
    journeys: Schema.Array(TaskPayload).annotate(
        about(
            "The tasks people get done with the system today, each entry point and rule of the analysis in exactly one task, written by the analysis from the code.",
        ),
    ),
}).annotate(
    about(
        "How people get their tasks done with the system today: the journeys of the analysis, read by whoever designs how they should be done.",
    ),
);

export type TaskPayload = typeof TaskPayload.Type;
export type JourneysPayload = typeof JourneysPayload.Type;
