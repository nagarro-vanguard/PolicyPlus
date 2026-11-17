---
name: write-business-rules
description: Writes every business rule its blocks decide - what is allowed, refused, computed, chosen or changed - each in words a tester could check, attached to the change of state it gates, and reads every line of its blocks.
---

# Write Business Rules

Goal: a capability's page shows every rule its code decides, read by people who must rebuild or change the system without losing one. A rule missed costs the most and no later stage will notice; a mechanism written as a rule costs the reader's trust in every other. Other jobs read other blocks: write only what is decided in yours.
Tools: the check and carry commands for `jobId` in `briefPath`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `jobId` (required): the job, for its check and carry.
- `jobPath` (required): the job's blocks, every line of which you read (`describe-shape.ts RulesJob`).
- `briefPath` (required): your commands, the rules of a rule, and what to read besides: the accepted lives, one JSON record per line, whose transitions a rule may gate, and what earlier stages established.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last rules: carry what stands, then write only what it changes.

## Work

Follow the data through each block of `jobPath` and write `BusinessRule` and `Fact` records as the rules say, then one `Receipt` last listing the line ranges you read. The check printing no gap is the minimum.

## Output

Records to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`; `describe-shape.ts` first. Correct a record by appending it with its id; remove one with `<scriptsCommand>/explain-capability-rules.ts drop-record <jobId> <recordId> --why <text>`.
