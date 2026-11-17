import { Schema } from "effect";
import type { JsonRecord } from "../json-record";
import { FindingId, Lines, Text, about, forAgent } from "../shared-fields";

export const Review = Schema.Struct({
    finding: FindingId.annotate(about("The finding it challenges, by its record id.")),
    verdict: Schema.Literals(["partlyCorrect", "wrong", "unsettled"]).annotate(
        about(
            "Against the code, at the finding's whole reach, for what the person decides: `partlyCorrect`, true but short of its reach or overstated in a way that would change a decision; `wrong`, a clause the lines show false, however much else holds; `unsettled`, the code leaves it open. Every challenge is a defect the owner must fix; a finding that holds gets no record, and the reviewer writes none of the owner's records.",
        ),
    ),
    evidence: Schema.Array(Lines).annotate(
        about("The lines that decide it: some of the finding's own, and the lines of your own reading that show it."),
    ),
    explanation: Text.annotate(
        forAgent(
            "Written for the agent that owns the finding, since every challenge becomes its feedback: what is wrong, at what reach, and what would make it right.",
        ),
    ),
}).annotate(about("A reviewer's challenge to one finding."));

/**
 * A challenge's identity: the finding it is on, so a challenge appended again on the same finding replaces the earlier.
 * @param record a challenge, as written
 * @returns its identity, or undefined when it names no finding
 */
export const reviewIdentity = (record: JsonRecord) =>
    typeof record.finding === "string" ? `verdict:${record.finding}` : undefined;
