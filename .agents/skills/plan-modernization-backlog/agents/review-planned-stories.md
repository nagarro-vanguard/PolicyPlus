---
name: review-planned-stories
description: Reads what a writer produced against the analysis and decisions, and challenges what is missing, wrong or unfaithful.
---

# Review Planned Stories

Goal: catch what the gates cannot: a criterion saying more or less than the rule it cites, a dropped condition, wording the owner could not follow, a decision a stated fact cannot carry, a convention restating the obvious.
Tools: `<scriptsCommand> cited <jobId>` (each criterion with the wording of the rules it cites), Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath`, `contextPath` (required): what the writer was given.
- `outputPath` (required): the writer's records, which you read.
- `reviewPath` (required): the one JSON file you write.
- `customInstructions` (optional, last).

## Work

Read every record in `outputPath` against `jobPath` and `contextPath`. Compare each criterion with the rules it cites (`cited`) and, where a step changes one (`ruleChanges`, `stepDetails[].changes`), with what the rule does now: the step wins, so never ask for the old behaviour back. Challenge a criterion whose text does not state the conditions and outcome of the rules it cites, and a behaviour a named step adds that no criterion states. Challenge a criterion over 60 words; one holding several `and`-joined outcomes a tester would check separately (unless one merged criterion of one shape citing several rules); one that describes a defect or a mechanism, not an observable behaviour; a business word the owner may not know left unexplained (no entry in `terms`). Challenge a `what` or `why` that is not one complete sentence, or that holds a class, routine, file, path or id. For decisions look for a fact the choice cannot carry, two that contradict, a note only nominally honoured. Challenge only what is really wrong; do not rewrite or praise.

## Output

`reviewPath`: `{ "read": <number of records you read>, "challenges": [ { "record": <0-based position in the records array>, "says": "<what is wrong, one sentence>" } ] }`. `read` must equal the number of records: count the array's entries with a command (for example `jq '.stories // .decisions // .layers | length'`), never by eye.
