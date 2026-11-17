import { Schema } from "effect";
import { BusinessRuleId, Lines, Text, TransitionId, about, forPerson, ownRecordId } from "../shared-fields";

export const BusinessRule = Schema.Struct({
    id: BusinessRuleId.annotate(ownRecordId),
    says: Text.annotate(
        forPerson(
            "The rule as a tester could check it and a rebuild keep it: the condition, then the outcome, in the order a person meets them, in the present tense ('When an application is submitted without a signed declaration, it is refused and the applicant is told \"Please sign the declaration\"'). Numbers and names as the code fixes them, in the reader's units; what a person is told, quoted exactly; what the business sees, never the mechanism ('saved as Approved', not 'the procedure updates the status column'); a state by its name in the entity's life, never the value stored for it ('Approved', not 'APR' or 3).",
        ),
    ),
    decidedAt: Lines.annotate(
        about(
            "The lines that decide it, inside one block of the job: the condition, the calculation or the choice. The rule belongs to the block holding them, so one decision is one rule.",
        ),
    ),
    evidence: Schema.Array(Lines).annotate(
        about(
            "The rule's other lines, wherever they are: the message shown, the outcome written, a value read from elsewhere; none when the deciding lines hold it all.",
        ),
    ),
    gates: Schema.optionalKey(
        TransitionId.annotate(
            about(
                "The transition it allows or refuses, from the accepted lives the job is given; left out when it gates no change of state (a calculation, a check on what is shown).",
            ),
        ),
    ),
}).annotate(
    about(
        "A business rule: one decision the code makes about the business's data or people, which allows, refuses, computes, chooses or changes something. One decision is one rule, written where it is decided; the same check written twice in the code (on a screen and on a server, or in a mainframe transaction and the batch job that reruns it) is two rules. Logging, caching and plumbing are no rule unless they change an outcome. The entry points that apply it, and the capabilities that share it, are derived from where it is decided, never stored.",
    ),
);
