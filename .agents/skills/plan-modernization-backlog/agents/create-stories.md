---
name: create-stories
description: Writes the stories of a modernization in their reader's words, criteria resting on the rules and decisions each builds.
---

# Create Stories

Goal: stories an owner can groom and a developer build, covering what the job names once.
Tools: `<scriptsCommand> check <jobId>` (wording per `rules/presentation.md`), `bun <this skill's folder>/cli/describe-shape.ts Story`, Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (its `kind` says which job), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last stories; keep what stands.

## Work

Read both files and the job's bundles. By `kind`:

- `surfaces`: a story is a task a person does: one surface's actions, each once. Cite each rule to build once, `{"_tag":"rule","id":...}`, and each listed state change `{"_tag":"transition"}`.
- `journey`: group the journey's steps (`stepDetails`) into stories of one task: `steps` their ids, `actions` exactly their entry points, `components` what it builds (`ownComponents`, each once), citing the rules they enforce once.
- `shared`, `components`: technical stories, no actions or steps; `components` lists what each builds; criteria cite the rules they enforce, once.
- `foundation-stories`: one or more per `area` decision, citing it `{"_tag":"decision"}`, criteria a command can check; none about reaching an outside system in `adapted`.

`what` and `why` are each one complete sentence in the product's words, no class, routine, file, path or id; a story building one component of a split names that component's own responsibility in both, never its parent's description. A criterion reads "Given ..., when ..., then ...": one observable behaviour, at most 60 words (90 citing several rules), at most 7 per story: merge rules of one shape into one criterion citing them all. Where a step changes a rule (`ruleChanges`, `changes`), the step wins: also cite `{"_tag":"step","id":...}` and state what the rule does now. Behaviour no rule or decision states goes in `open`, one sentence each. `terms` are business words introduced, each with its meaning, including any the product owner may not know; `journey` only if a person starts the work.

## Output

`outputPath`: `{ "stories": [...] }` as `describe-shape.ts Story` prints; the check prints no gap.
