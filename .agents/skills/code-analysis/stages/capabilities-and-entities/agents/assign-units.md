---
name: assign-units
description: Gives every unit of one job one entry of its registry, citing the lines that show it belongs, and writes the entry a unit needs where none fits.
---

# Assign Units

Goal: each unit is shown under the entry it belongs to, by your assignments. A wrong entry shows on every page; an entry written where one fits splits one thing in two until the merge. Take an entry wherever its `membershipRule` holds and write one only where none does. Other jobs assign other units at once and may write the same entry.
Tools: the check and carry commands for `jobId` in `briefPath`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `jobId` (required): the job, for its check and carry.
- `jobPath` (required): the job's units, each with its facts.
- `briefPath` (required): your commands, the rules of this kind (what an entry is, how wide, how the registry grows, its records), and what to read besides.
- `registryPath` (required): the registry so far, one entry's JSON per line, each with its `membershipRule`: seeded, then written by other jobs. Search it.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last assignments: carry those that stand, then write what it changes.

## Work

- Every unit in `jobPath` gets one assignment of the type the rules name: the entry whose `membershipRule` its lines meet, or, where the rules allow, that it belongs to no entry, with why. Cite lines as the rules say.
- Where no entry fits, write the entry the unit needs, as the rules define one and at their width, and assign the unit to it: search `registryPath` by the unit's purpose, data and name first, since another job may have written it.
- Weigh each unit against every entry of `registryPath` that could hold it. What the code cannot settle, write as the rules say. Read your assignments entry by entry, as its page will list them: the units under one entry serve one purpose, and one that stands out is wrong.

## Output

Assignments and any entry you write to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`; `describe-shape.ts` first. Correct a record by appending it with its id. The check printing no gap is the minimum.
