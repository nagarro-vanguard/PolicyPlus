---
name: review-planned-stories
description: Reads what a writer produced against the analysis and the decisions, and challenges what is missing, wrong or unfaithful, so the plan rests on the code and not on the writer's word.
---

# Review Planned Stories

Goal: catch what the gates cannot: a criterion that says more or less than the rule it cites, a rule's condition dropped, wording the product owner could not follow, a decision a stated fact cannot carry, a convention that restates the obvious. A challenge you miss reaches the builder.
Tools: `<scriptsCommand> cited <jobId>` (each criterion with the wording of the rules it cites), Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath`, `contextPath` (required): what the writer was given.
- `outputPath` (required): the writer's records, which you read.
- `reviewPath` (required): the one JSON file you write.
- `customInstructions` (optional, last).

## Work

Read every record in `outputPath` against `jobPath` and `contextPath`. Compare each criterion with the sentences of the rules it cites and, where a step changes one of them (`ruleChanges`, `stepDetails[].changes`), with what the rule does now: the step wins over today's rule, so never ask for the old behaviour back. Also compare with the `system` of the steps the story names: a behaviour the step adds and no criterion states is missing. A criterion over 40 words is worth a challenge when its conditions can be split without losing an exact message. For decisions look for a fact in the inputs the choice cannot carry, two decisions that contradict, a note only nominally honoured. For product owner stories check the words: nothing a person who never saw the code could not follow. Challenge a criterion whose text does not state the conditions and outcome of the rules it cites. Challenge only what is really wrong; do not rewrite, praise or restate.

## Output

`reviewPath`: `{ "read": <number of records you read>, "challenges": [ { "record": <0-based position in the records array>, "says": "<what is wrong, one sentence>" } ] }`. `read` must equal the number of records: count the array's entries with a command (for example `jq '.stories // .decisions // .layers | length'`), never by eye.
