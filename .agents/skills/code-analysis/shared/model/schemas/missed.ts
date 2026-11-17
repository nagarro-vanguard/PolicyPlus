import { Schema } from "effect";
import { FindingId, Lines, MissedId, Text, about, eachOnce, forAgent, ownRecordId } from "../shared-fields";

export const Missed = Schema.Struct({
    id: MissedId.annotate(ownRecordId),
    says: Text.annotate(
        forAgent(
            "What the job's findings miss, at its whole reach, and what would put it right, written for the agent that owns the findings: it becomes that agent's feedback.",
        ),
    ),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about("The lines that show it, where the owning agent may write a record: its next run starts reading there."),
    ),
    concerns: Schema.optionalKey(
        Schema.NonEmptyArray(FindingId)
            .check(eachOnce((id: string) => id, "findings"))
            .annotate(about("The findings it is about, each once; left out when it is about nothing written yet.")),
    ),
}).annotate(
    about(
        "What a reviewer found missing from a job's findings. The reviewer writes this instead of the record itself, so the agent that owns the findings writes every record and a reviewer reads it. The gate checks where it points; it becomes the owner's feedback; never stored.",
    ),
);
