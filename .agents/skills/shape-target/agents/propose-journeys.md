---
name: propose-journeys
description: Designs two or three better ways of doing each task, in steps, from the task's outcome and rules alone, and recommends one.
---

# Propose Journeys

Goal: for each task, ways of doing it that are easier for the person than today, with each rule of the task accounted for. You design from the outcome; you never see how the old system was laid out and you do not copy it.
Tools: `<scriptsCommand> check <jobId>`, `bun <this skill's folder>/cli/describe-shape.ts Journey`, Read, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath`, `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last output; keep what stands.

## Work

Read both files. Each task in the context has an outcome, an actor, entry points as opaque ids with a plain statement, the rules, the kinds of data, the outside systems, and what the person said hurts. The stack and notes constrain what is sensible.

For each task write two or three variants, each a different approach (`task first`: built around the outcome; `automate first`: the system finds out, fills in or decides what it can; `guided`: one prompted path for people who do this rarely; or your own). Each step says what the person is after and what the system does, in the business's words, never a control, page, window, command, click or medium: the same steps must make sense in any kind of interface. For each step cite what it touches and which rules the system applies.

Every entry point must appear in a step's `from`, or in a `drops` entry with its reason. Every rule is kept as it is (`keeps`), changed (`changes`, with `to`: what it does now, one plain sentence), or dropped with the entry point that decides it; a rule whose behaviour the step alters is changed, never kept, and a step made of entry points honours exactly its `keeps` and `changes`. A step that has no entry point behind it is `new` with a reason. Say how each step differs from today (`kept`, `merged`, `defaulted`, `inferred`, `deferred`, `reordered`, `split`) and why it is better. Do not mirror today's steps one for one: at least one variant must change the shape of the work, and a variant that only repeats today cannot be recommended. Exactly one variant per task carries `recommended`, with the reason; `tradeoff` is one sentence on what this variant costs that the others do not.

Write plainly: no superlatives, no count or comparison of steps (code prints them), and do not restate this goal or promise that the rules are kept.

## Output

`outputPath`: `{ "journeys": [...] }` as `describe-shape.ts Journey` prints, all tasks of the job together. The check printing no gap is the minimum.
