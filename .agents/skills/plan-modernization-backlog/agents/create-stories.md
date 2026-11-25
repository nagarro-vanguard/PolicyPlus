---
name: create-stories
description: Writes the stories of a modernization in their reader's words, criteria resting on the rules and decisions each builds.
---

# Create Stories

Goal: stories an owner can groom and a developer build, covering what the job names once.
Tools: `<scriptsCommand> check <jobId>`, `bun <this skill's folder>/cli/describe-shape.ts Story`, Read, Grep, Write. Read `rules/stories.md` first: it says what a story and a criterion are.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (its `kind` says which job), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last stories; keep what stands.

## Work

Read both files and the job's bundles. By `kind`:

- `journey`: group the journey's steps (`stepDetails`) into stories of one outcome each: `steps` their ids, `actions` exactly their entry points, `components` what it builds (`ownComponents`, each once), citing the rules they enforce once.
- `shared`, `components`: technical stories, no actions or steps; each builds components of one kind (`units`), cut by purpose; criteria cite the rules they enforce, once.
- `foundation-stories`: first, one story that sets up every layer (`layerIds`), a criterion per layer citing it `{"_tag":"layer"}` and a command that runs its check; then one or more per `area` decision, citing it `{"_tag":"decision"}`, criteria a command can check; none about reaching an outside system in `adapted`.

Cite each rule to build once. Where a step changes a rule (`ruleChanges`, `changes`), also cite `{"_tag":"step","id":...}` and state what the rule does now. Name the actor of the journey in `what`. Behaviour no rule or decision states goes in `open`; `journey` only if a person starts the work.

## Output

`outputPath`: `{ "stories": [...] }` as `describe-shape.ts Story` prints; the check prints no gap.
