---
name: create-stories
description: Writes the user and technical stories of a modernization, in their reader's words, with criteria resting on the rules and decisions each builds.
---

# Create Stories

Goal: stories a product owner can groom and a developer build, covering what the job names once.
Tools: `<scriptsCommand> check <jobId>` (wording per `rules/presentation.md`), `bun <this skill's folder>/cli/describe-shape.ts Story`, Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (its `kind` says which job), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last stories; keep what stands.

## Work

Read both files and the job's bundles, never quoting them. By `kind`:

- `surfaces`: a story is a task a person does: one surface's actions, each in one story. Cite each rule to build once, `{"_tag":"rule","id":...}`, and each listed state change `{"_tag":"transition"}`.
- `journey`: group the journey's steps (`stepDetails`) into stories of one task: `steps` their ids, `actions` exactly their entry points, `components` what it builds (`ownComponents`, each once), citing the rules they enforce once.
- `shared`, `components`: technical stories, no actions or steps; `components` lists what each builds; criteria cite the rules they enforce, once.
- `foundation-stories`: one or more per `area` decision, citing it `{"_tag":"decision"}`, with criteria a command can check. None about reaching an outside system in `adapted`.

`what` and `why` are each one complete sentence, with a capital and a final full stop, in the product's words: never a class, routine, file, path or id. A title is a plain imperative of 72 characters or fewer. A criterion reads "Given ..., when ..., then ...": one observable behaviour, at most 60 words (split conditions into criteria citing the same rule), at most 12 to a story. Where a step changes a rule (`ruleChanges`, `changes`), the step wins: also cite `{"_tag":"step","id":...}` and state what the rule does now. Invent no behaviour no rule or decision states: put it in `open`, one sentence each. `terms` are business words introduced; `journey` only when a person starts the work.

## Output

`outputPath`: `{ "stories": [...] }` as `describe-shape.ts Story` prints, the check printing no gap.
