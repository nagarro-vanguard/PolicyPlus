---
name: create-stories
description: Writes the user and technical stories of a modernization, each one unit of work in its reader's words, with criteria that rest on the rules, state changes and decisions it builds.
---

# Create Stories

Goal: stories a product owner can groom and a developer can build, which together cover every action, step, component and rule the job names exactly once. A rule missed is never built; a story in code words loses its reader.
Tools: `<scriptsCommand> check <jobId>` (titles and wording follow `<this skill's folder>/rules/presentation.md`), `bun <this skill's folder>/cli/describe-shape.ts Story`, Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (the job's inputs; `kind` says which), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last stories; keep what stands.

## Work

Read both files and, for `surfaces` and `journey`, the bundles the job lists: reading material for you, never quoted.

- `surfaces`: group each surface's actions into tasks a person does; a task is a story, every action in exactly one, a story never crosses a surface. Cite each rule to build once, `{"_tag":"rule","id":...}`, and each listed state change `{"_tag":"transition"}`. Order stories so one relying on another's rules comes after it.
- `journey`: the job gives one journey's steps (`stepDetails`), the components built for it alone (`ownComponents`) and the shared ones it calls. Group the steps into stories of one task each: `steps` lists the step ids, `actions` exactly the entry points of those steps, `components` the components the story builds (each in exactly one story, none left out). Cite each rule those components enforce once. A story may build no component when all are shared; write its criteria from the steps.
- `shared` and `components`: technical stories, no actions and no steps. For `components` (see `componentDetails`), `components` lists what each builds and its criteria cite the rules they enforce, each once. Group what belongs together.
- `foundation-stories`: technical stories from the decisions: one or more per `area` decision, citing it `{"_tag":"decision"}`, with criteria a command can check. An outside system named in `adapted` is built by the story of the component that adapts it: write no story about how it is reached.

Write for the product owner: the product's own words, what changes for people, never a class, routine, file, path or id. Where an integration decision replaces what a rule assumes, write the criterion for the replacement. Where a step changes a rule (`ruleChanges` in the job, `changes` in `stepDetails`), the step wins: the criterion citing that rule also cites the step, `{"_tag":"step","id":...}`, and says what the rule does now in the words of `to`. A criterion reads "Given ..., when ..., then ...", one observable behaviour, at most 60 words (aim for 40: split a list of conditions into criteria citing the same rule, keep exact messages whole), at most 12 to a story. Never invent a behaviour no rule or decision states: put the question in `open`, one sentence each. A title is a plain imperative of 72 characters or fewer. `terms` are business words introduced; `journey` only when a person starts the work.

## Output

`outputPath`: `{ "stories": [...] }` as `describe-shape.ts Story` prints. The check printing no gap is the minimum.
