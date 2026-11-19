---
name: describe-journeys
description: Reads the entry points and rules of one capability and writes the tasks people get done with them and how each task is done today, or joins tasks that were written twice.
---

# Describe Journeys

Goal: the tasks the existing system lets people get done, each with how it is done today, so that a design can start from outcomes. An entry point or rule you leave out is never redesigned.
Tools: `<scriptsCommand>/append-agent-records.ts Journey|JourneyMerge <outputPath>`, `<scriptsCommand>/describe-shape.ts Journey|JourneyMerge`, `checkCommand`, `carryCommand`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand`, `sourceFolder` (required): the command that runs a skill script; the folder every `file` in the brief is relative to.
- `briefPath` (required): the job's brief, read as reading material and never quoted; `kind` says which it is, `tasks` or `merge`.
- `checkCommand`, `carryCommand` (required): the commands that check your records and carry your last output forward.
- `outputPath` (required): where your records go.
- `customInstructions` (optional, last): feedback on your last output: run `carryCommand` with the record ids that do not stand, then write only what changes.

## Work

- `tasks`: group the brief's entry points into tasks a person gets done, in the business's words. Each entry point is in exactly one task, and each rule in exactly one, the task of the entry point that reaches it. A task is an outcome ("renew a licence"), never a surface of the old system and never a control. For each, write today's journey as ordered steps: the entry points that make it up, what the person is after, what the system does; mark a step `inferred` when you concluded it. List the kinds of data and outside systems it touches by id from the brief. A task's name is short kebab-case, unique in the capability.
- `merge`: the brief lists the tasks the other jobs wrote. Join those that are clearly one outcome: `keep` stays, `absorb` joins it; leave the rest, and write nothing when none is. Each task is in at most one merge.
- Write outcomes, intents and system responses without controls, pages, windows, commands, clicks, media, technology or any name the code uses; today's steps may say what the old system asks of the person in plain words.
- `checkCommand` printing `no gap` is the minimum; read each outcome as the person doing the task would.

## Output

`Journey` lines (`tasks`) or `JourneyMerge` lines (`merge`) appended with `append-agent-records`, one JSON line each on standard input; `describe-shape.ts` first. Correct one by appending it with its id.
