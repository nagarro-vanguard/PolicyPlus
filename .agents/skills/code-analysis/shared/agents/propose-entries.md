---
name: propose-entries
description: Writes one registry, the entries a kind of name is chosen from, and merges entries that mean the same.
---

# Propose Entries

Goal: every unit across the code is named by one entry. Other jobs choose by an entry's `membershipRule` and write the entry they need where none fits: a vague or overlapping entry sends units to the wrong place everywhere; two of one meaning split one thing on every page. You merge duplicates when the others are done: every entry the jobs wrote is read and kept or merged, never dropped.
Tools: the check and carry commands for `jobId` in `briefPath`, `<scriptsCommand>/append-agent-records.ts` and `describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `jobId` (required): the job, for its check and carry.
- `jobPath` (required): the entries the jobs wrote, beside the registry so far, or for a merge job, its slice of written entries.
- `briefPath` (required): your commands, the rules of this kind (what an entry is, how wide, how the registry grows and merges), and what to read besides.
- `registryPath` (required): the registry so far, one entry's JSON per line: every entry when you merge. Search it.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last registry: carry its entries but those that fall, then write what changes.

## Work

- Merging: read every entry in `jobPath`; keep each written entry, or, where it means what another means, name it in that entry's `mergedFrom`; never drop one; change only the words the rules allow. A kept entry returns with its record id (`append-agent-records.ts <Record> <outputPath> --findings <registryPath>`).
- Search `registryPath` by meaning, never by name alone. What the code cannot settle, write as the rules say. Place a few units from different parts by your registry alone: each meets one entry's `membershipRule`, and no other's.

## Output

Records to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`. Correct a record by appending it with its id. The check printing no gap is the minimum.
