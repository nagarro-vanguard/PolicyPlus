---
name: describe-current
description: Reads the entry points and rules of one part of an existing system and writes the tasks people do with them and how each task is done today, or joins tasks written twice.
---

# Describe Current

Goal: the tasks the existing system lets people get done, each with how it is done today, so that a design can start from outcomes. An entry point or rule you leave out is never redesigned. You are the one writer who reads the old system's own words.
Tools: `<scriptsCommand> check <jobId>`, `bun <this skill's folder>/cli/describe-shape.ts Task|Merge`, Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId`, `jobPath` (the job's inputs; `kind` says which), `contextPath`, `outputPath` (required).
- `customInstructions` (optional, last): feedback on your last output; keep what stands.

## Work

Read both files and, for `tasks`, the surface files the context lists: reading material, never quoted.

- `tasks`: group the job's entry points into tasks a person gets done, in the business's words. Each entry point is in exactly one task, and each rule in exactly one, the task of the entry point that reaches it. A task is an outcome ("renew a licence"), never a surface of the old system and never a control. For each task write today's journey: ordered steps, each citing the entry points that make it up, saying what the person is after and what the system does. Mark a step `inferred` when you concluded it. List the kinds of data and outside systems it touches by id from the context. Ids are short kebab-case.
- `merge`: the context lists tasks from several jobs. Join those that are the same outcome: `keep` stays, `absorb` joins it. Join only what is clearly one task; leave the rest.

Write outcomes, intents and system responses without controls, pages, windows, commands, clicks, media or technology. Today's steps may say what the old system asks of the person in plain words, but never a control's name.

## Output

`outputPath`: `{ "tasks": [...] }` as `describe-shape.ts Task` prints, or `{ "merges": [...] }` as `describe-shape.ts Merge` prints. The check printing no gap is the minimum.
