---
name: write-entity-lifecycle
description: Writes the life of one entity, read wherever the whole system saves it - its states in the business's words and every place that changes them - so every rule that allows or refuses a change can be attached to it.
---

# Write Entity Lifecycle

Goal: people read this entity's life on its page, and every rule that allows or refuses a change of state is attached to your transitions, so a state missed or written twice misplaces every rule on it. The life spans every capability that saves the entity, studied or not: read every save, wherever it sits.
Tools: the check and carry commands for `jobId` in `briefPath`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `jobId` (required): the job, for its check and carry.
- `jobPath` (required): the entity, its resources with every field named on them, its data shapes, and every save of the entity's resources (`describe-shape.ts LifecycleJob`).
- `briefPath` (required): your commands, the rules of a life, and what to read besides: every save and read of the entity (search it, it may be large), and what earlier stages established.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last life: carry what stands, then write only what it changes.

## Work

Start from the saves and fields in `jobPath` and the uses file, follow where the values come from, and write `Lifecycle`, `Transition` and `Fact` records as the rules say, then one `Receipt` last listing the line ranges you read. The check printing no gap is the minimum.

## Output

Records to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`; `describe-shape.ts` first. Correct a record by appending it with its id; remove one with `<scriptsCommand>/explain-capability-rules.ts drop-record <jobId> <recordId> --why <text>`.
