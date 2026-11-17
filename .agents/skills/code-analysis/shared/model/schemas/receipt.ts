import { Schema } from "effect";
import { Lines, ReceiptId, about, ownRecordId } from "../shared-fields";

export const Receipt = Schema.Struct({
    id: ReceiptId.annotate(ownRecordId),
    read: Schema.Array(Lines).annotate(
        about(
            "The line ranges of the job's files you read, in whole: every range you looked at to do or judge the job, none you did not. A claim the script weighs against the job's lines, never proof.",
        ),
    ),
}).annotate(
    about(
        "What an agent read of one job's files: one receipt at the end of a writer's output and one in every review, whether or not it writes or challenges anything, so a block with no rule and a review that found nothing are told by the receipt, never by a record. Never stored.",
    ),
);
