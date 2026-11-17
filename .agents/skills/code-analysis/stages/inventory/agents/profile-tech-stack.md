---
name: profile-tech-stack
description: Names what the system is made of: its parts, the technologies its code is built with, and the risks and assumptions a person must know, each backed by the lines that show it.
---

# Profile Tech Stack

Goal: a person deciding about this system, who has never seen its code, learns what it holds and is built with. Every later fact sits on a part you name; How it runs studies each framework and platform you name.
Tools: `<scriptsCommand>/inventory-codebase.ts check`, `<scriptsCommand>/inventory-codebase.ts remaining <count>`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `fileSummaryPath` (required): what Inventory found; `describe-shape.ts FileSummary` says what it means.
- `cataloguePath` (required): the catalogue: the questions a fact answers, the part kinds, the risk categories and severities, the ways to confirm.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last output: `inventory-codebase.ts carry [record ids]` copies its records but those that do not stand; write what changes.

## Work

- One `SystemPart` for each thing the code builds that someone runs, deploys or schedules, found from what builds, deploys or schedules it, never from a project file alone: of a kind `cataloguePath` lists, its folders in one source root.
- One `Technology` for each thing the code is built with or runs inside, cited from lines in scope: its `uses` say which parts use it and at which version. A language or a kind of file that is not code names its files in `covers`, as .gitignore patterns: every file in scope that is not binary is covered.
- `Fact` records: one with a `risk` for what a person must act on first, one with an `assumed` basis for what you go with where no file settles it. Each answers one question of `cataloguePath`, resting on lines.
- Start from `fileSummaryPath`; `remaining` shows the folders in scope: each large one is the team's code or needs a fact.

## Output

`SystemPart`, `Technology` and `Fact` lines with `append-agent-records.ts <Record> <outputPath>`, one JSON line each on standard input or `--from <file>`; it prints each id. Correct a record by appending it with its id. `check` printing `no gap` is the minimum.
