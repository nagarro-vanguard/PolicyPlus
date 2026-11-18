import { Schema } from "effect";
import { about, Text } from "./fields";

export const Status = Schema.Literals([
    "planned",
    "created",
    "branched",
    "approved",
    "built",
    "merged",
    "blocked",
    "failed",
]);

export const LedgerEntry = Schema.Struct({
    item: Schema.optionalKey(Text.annotate(about("The work item's address in the tracker."))),
    branch: Schema.optionalKey(Text),
    worktree: Schema.optionalKey(Text),
    status: Status.annotate(about("Where the work item stands in delivery.")),
    pr: Schema.optionalKey(Text),
    result: Schema.optionalKey(Text.annotate(about("The folder holding the delivery's evidence and result."))),
}).annotate(about("One work item's progress."));

export const Ledger = Schema.Struct({
    reviewed: Schema.optionalKey(
        Text.annotate(about("When the person acknowledged the plan, as an ISO date and time.")),
    ),
    items: Schema.Record(Schema.String, LedgerEntry).annotate(
        about("By work item key: an epic's key or a story's key."),
    ),
}).annotate(about("What has been done with the plan's work items; written during delivery, never by an agent."));

export type Ledger = typeof Ledger.Type;
export type LedgerEntry = typeof LedgerEntry.Type;
