import { Schema } from "effect";
import { WorkItem } from "../../core/documents";
import { about, Text } from "../../core/records";

export const WorkItemFound = Schema.Struct({
    workItem: WorkItem,
    key: Text.annotate(about("The work item's key in its tracker, as its approver knows it.")),
    url: Schema.optionalKey(Text).annotate(about("Its page in the tracker, when it came from one.")),
}).annotate(about("The work item as it was read and checked."));
