---
name: create-stories
description: Writes the user and technical stories of a modernization, each one unit of work in its reader's words, with criteria that rest on the rules, state changes and decisions it builds.
---

# Create Stories

Goal: stories a product owner can groom and a developer can build, which together cover every action and every rule the job names exactly once. A rule missed is never built; a story in code words loses its reader.
Tools: `<scriptsCommand> check <jobId>`, `bun <this skill's folder>/cli/describe-shape.ts Story`, Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (the job's inputs; `kind` says which), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last stories; keep what stands.

## Work

Read both files and, for `surfaces`, the bundles the job lists: reading material for you, never quoted.

- `surfaces`: group each surface's actions into tasks a person does; a task is a story, every action in exactly one, a story never crosses a surface. Write for the product owner: the product's own words, what changes for people, never a class, routine, file, path or id. Each rule to build is cited by exactly one criterion, `{"_tag":"rule","id":...}`; a criterion may group related rules, and a story has at most 12. Cite each listed state change `{"_tag":"transition"}`. Order stories so one relying on another's rules comes after it. `terms` are business words introduced; `journey` only when a person starts the work.
- `shared`: technical stories, no actions, for the shared rules, grouped by what they do, each rule cited once.
- `foundation-stories`: technical stories from the decisions: one or more per `area` decision, citing it `{"_tag":"decision"}`, with criteria a command can check, and how any assumption is proven.

Where an integration or scope decision in the context replaces what a rule assumes (folders, the registry, the desktop), write the criterion for the replacement and cite the decision beside the rule. A criterion reads "Given ..., when ..., then ...", one observable behaviour. Never invent a behaviour no rule or decision states: write the criteria that hold without it and put the question in `open`, one sentence each, for the person to answer. A title is a plain imperative of 72 characters or fewer.

## Output

`outputPath`: `{ "stories": [...] }` as `describe-shape.ts Story` prints. The check printing no gap is the minimum.
