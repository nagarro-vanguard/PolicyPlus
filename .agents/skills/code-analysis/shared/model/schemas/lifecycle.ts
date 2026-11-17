import { Schema } from "effect";
import {
    EntityId,
    LifecycleId,
    Lines,
    Text,
    TransitionId,
    about,
    copiedFromCode,
    eachOnce,
    exactlyOneOf,
    forPerson,
    forScripts,
    ownRecordId,
} from "../shared-fields";

const StateNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(1));

const State = Schema.Struct({
    name: Text.annotate(
        forPerson("The state in the business's words, as a person deciding about the system would say it (Submitted)."),
    ),
    writtenAs: Text.annotate(
        copiedFromCode(
            "How the code writes it, verbatim: the value it stores (SUB, 2), or which field it sets (approved_on set). A tester finds it by this.",
        ),
    ),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about("Lines that write or test this state; at least one, wherever in the system they are."),
    ),
}).annotate(
    about(
        "A state: a condition one record of an entity is in that the code acts on, never a state of what a person sees (a greyed button, an open panel).",
    ),
);

/**
 * The rule that a life names the fields holding its state exactly when it has states.
 * @returns the filter
 */
const fieldsWithStates = () =>
    Schema.makeFilter(
        (life: { readonly states?: unknown; readonly stateFields?: unknown }) =>
            (life.states === undefined) === (life.stateFields === undefined) ||
            "names stateFields exactly when it has states",
    );

export const Lifecycle = Schema.Struct({
    id: LifecycleId.annotate(ownRecordId),
    entity: EntityId.annotate(about("The entity whose life this is: one life per entity.")),
    stateFields: Schema.optionalKey(
        Schema.NonEmptyArray(Text)
            .check(eachOnce((field: string) => field, "fields"))
            .annotate(
                copiedFromCode(
                    "The fields that hold its state, as the code names them, each once: one status field, or several a state is read from together (a date set, a flag).",
                ),
            ),
    ),
    states: Schema.optionalKey(
        Schema.NonEmptyArray(State)
            .check(eachOnce((state: { readonly name: string }) => state.name, "states"))
            .check(eachOnce((state: { readonly writtenAs: string }) => state.writtenAs, "written forms"))
            .annotate(
                about(
                    "Every state the code writes or tests, each once, in the order a record passes them: a transition names a state by its number here, the first being 1.",
                ),
            ),
    ),
    noStates: Schema.optionalKey(
        Text.annotate(
            forPerson(
                "Why no record of it changes state that the code acts on: reference data set once, a log written once.",
            ),
        ),
    ),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about("Lines that show the fields holding its state, or why it has none; at least one."),
    ),
})
    .check(exactlyOneOf(["states", "noStates"]))
    .check(fieldsWithStates())
    .annotate(
        about(
            "The life of one entity, read wherever the whole system saves it: its states, or why it has none. Every rule that allows or refuses a change of state is attached to its transitions, so a state missed or written twice misplaces every rule on it.",
        ),
    );

export const Transition = Schema.Struct({
    id: TransitionId.annotate(ownRecordId),
    lifecycle: LifecycleId.annotate(about("The life it belongs to.")),
    fromStates: Schema.Union([
        Schema.Literal("created"),
        Schema.NonEmptyArray(StateNumber).check(eachOnce((state: number) => String(state), "states")),
    ]).annotate(
        forScripts(
            'The states it leaves, by their numbers in its life (the first state is 1), each once; or "created" where the code creates the record in its `to` state.',
        ),
    ),
    to: StateNumber.annotate(forScripts("The state it reaches, by its number in its life (the first state is 1).")),
    writtenAt: Lines.annotate(
        about(
            "The lines that write the new state: one place, so the same change made in two places is two transitions.",
        ),
    ),
}).annotate(
    about(
        "A transition: one place where the code moves a record from one state to another, or creates it in one. The entry points that make it are derived from where it is written, never stored.",
    ),
);
