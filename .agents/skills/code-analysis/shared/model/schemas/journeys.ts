import { Schema } from "effect";
import {
    BlockId,
    BusinessRuleId,
    CapabilityId,
    EntityId,
    ExternalSystemId,
    JourneyId,
    JourneyMergeId,
    Text,
    about,
    eachOnce,
    forPerson,
    ownRecordId,
} from "../shared-fields";

const Certainty = Schema.Literals(["sure", "inferred"]).annotate(
    about("`sure` when the code states it, `inferred` when it was concluded from the code."),
);

const JourneyStep = Schema.Struct({
    intent: Text.annotate(
        forPerson("What the person is trying to get done in this step, in the words of the business."),
    ),
    system: Text.annotate(forPerson("What the system does in response, in one sentence.")),
    from: Schema.NonEmptyArray(BlockId)
        .check(eachOnce((id: string) => id, "entry points"))
        .annotate(about("The entry points of the task that make up this step, each once, by record id.")),
    confidence: Certainty,
}).annotate(about("One step of how a task is done today."));

export const Journey = Schema.Struct({
    id: JourneyId.annotate(ownRecordId),
    capability: CapabilityId.annotate(about("The capability whose entry points this task is made of.")),
    task: Text.annotate(
        about(
            "A short kebab-case name for the task, unique among the tasks of the capability; with the capability's name it makes the task's stable id.",
        ),
    ),
    outcome: Text.annotate(
        forPerson(
            "What the person gets done, one sentence in the business's words, naming no control, page, window or command and no name the code uses.",
        ),
    ),
    actor: Text.annotate(forPerson("Who does it: a role of the business, or `person` when nothing says more.")),
    actions: Schema.NonEmptyArray(BlockId)
        .check(eachOnce((id: string) => id, "entry points"))
        .annotate(
            about(
                "Every entry point of the capability's brief that belongs to this task, by record id; each entry point is in exactly one task.",
            ),
        ),
    rules: Schema.Array(BusinessRuleId)
        .check(eachOnce((id: string) => id, "rules"))
        .annotate(
            about(
                "The rules of the capability's brief decided by this task's entry points; each rule is in exactly one task.",
            ),
        ),
    facts: Schema.Array(EntityId)
        .check(eachOnce((id: string) => id, "kinds of data"))
        .annotate(about("The kinds of data the task reads or changes, by record id.")),
    needs: Schema.Array(ExternalSystemId)
        .check(eachOnce((id: string) => id, "outside systems"))
        .annotate(about("The outside systems the task reaches, by record id.")),
    steps: Schema.NonEmptyArray(JourneyStep).annotate(
        about("How the task is done today, in order; every entry point of the task is in at least one step."),
    ),
}).annotate(
    about(
        "A task people get done with the system, read from the code: an outcome with the entry points and rules it rests on and the steps it takes today. The entry points are grouped by what the person gets done, never by where the code lives.",
    ),
);

export const JourneyMerge = Schema.Struct({
    id: JourneyMergeId.annotate(ownRecordId),
    keep: Text.annotate(about("The id of the task that stays, as the merge brief lists it.")),
    absorb: Schema.NonEmptyArray(Text)
        .check(eachOnce((id: string) => id, "tasks"))
        .annotate(about("The ids of the tasks that are the same task and join it, as the merge brief lists them.")),
}).annotate(about("Tasks written by different jobs that are one task: the others join the one kept."));
