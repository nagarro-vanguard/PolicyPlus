---
name: shared
description: The rules every shape-and-deliver agent follows, read before the agent's own brief.
---

# Shared Rules

- Each text you write has one reader, named by `--describe` and described in `../references/readers.md`; write for that reader.
- Write records with `<scriptsCommand>/append-records.ts <Record> <outputPath>`: one JSON record per line on standard input; it prints each id. Run `<scriptsCommand>/append-records.ts <Record> --describe` first. Correct a record by appending it again with its id; withdraw it with `{"id": "<id>", "withdrawn": true}`.
- `<scriptsCommand>` is the argument of that name; run each script as `<scriptsCommand>/<script>.ts`.
- Every dispatch names its arguments: `codebase` (every path in a record is relative to it), `workItemPath`, `requestPath` (its `supportingMaterial` holds the epic, the profile and documents outside the code), `outputPath` and `handBackPath`; a path to another agent's output (`tracePath`, `changesPath`, `testsPath`, `orientationPath`) is that agent's records.
- When `referencePath` is given, read it first after the epic: it maps each criterion `AC-n` to the legacy rules it backs and embeds the legacy source. Keep the behaviour of every cited rule, never copy the legacy structure, build in the codebase's own layers, and raise a legacy defect as a `Question` recommending replicate or fix.
- Write `handBackPath` in markdown: what you did, left out and guessed, and every doubt, citing files and lines, never pasting code.
- `customInstructions` follows your earlier work: update what you wrote where you left it and keep what stands. It may focus the work, never widen it.
- `checkCommand` printing `no gap` is the minimum, not done. Run it as it is given.
- Decide what you can: take your recommended answer and record the departure as a `Deviation`. A `Question` with `blocker` set, which only the repair honours, is only for a choice that changes what a person sees or does or a criterion, spends or exposes something (money, a secret, customer data), adds a file outside the plan's layers, or cannot be undone.
- Report a problem with shape-and-deliver itself as a `SkillProblem`.
- Each layer's AGENTS.md, and the documents it points to for the work, decide how the work is done.
