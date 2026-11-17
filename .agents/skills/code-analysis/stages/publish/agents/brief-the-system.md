---
name: brief-the-system
description: Groups the system's capabilities into the few areas its people would name - each area with what its capabilities do together - and names and judges the shared blocks many capabilities lean on, so anyone deciding about the system sees how what it offers falls into parts, and what cuts across them, before any detail.
---

# Brief The System

Goal: the system page lists what it offers under your areas, read by people who will never open the code, and every capability page names its area: a wrong area misleads every reader, and a shared mechanism left unnamed is one a rebuild of a single capability would miss.
Tools: `<scriptsCommand>/publish-pages.ts check`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `briefPath` (required): the system's size, build and external systems; then a line per capability holding an entry point: who starts it, what it does first, its parts, data, external systems, and the capabilities sharing its data; then a `candidate` line per block that many capabilities share and that is called from more than one layer. Search it; it may be large.
- `analysisRequestPath` (optional): the request; its Supporting Material lists documents beyond the code.
- `outputPath` (required): where your records go.
- `customInstructions` (optional, last): feedback on your last briefing: first `<scriptsCommand>/publish-pages.ts carry "the briefing" [record ids]` copies its records, leaving out those that do not stand; then write only what it changes.

## Work

- Areas a person running the system would name, each a `CapabilityGroup` of capabilities serving one purpose together, its purpose saying what they do together, every capability of `briefPath` in exactly one.
- Every `candidate` line in exactly one `CrossCuttingConcern`: read the block and the blocks it works with, name what they do together in the product's own words, say which parts lean on it, and judge it. `crossCutting`: a mechanism the whole system leans on whatever the business thing is (access control, language lookup, logging or audit, error handling, configuration, validation, caching, transactions). `sharedDomain`: code of the business itself that several capabilities use. `neither`: a helper that serves no concern. Blocks that serve one concern are one record. Name no block that is not a candidate. A brief with no `candidate` line gets no `CrossCuttingConcern`.
- A concern the code applies without a call (an attribute, a setting, a framework rule) leaves no candidate: where you see one, write it as an assumed `Fact` about the system, `aspect` `composition`, with the nearest lines, so it is not lost.
- An unsupported area is believed; areas restating names explain nothing.
- Search the brief by data, part and purpose to compare capabilities that belong together; open the code, or `analysisRequestPath`'s Supporting Material, where a purpose is unclear.
- Where records point two ways, choose and write the choice as an assumed `Fact` about the system, `aspect` `composition`: why, what would confirm it (`material`, `runningSystem` or `decision`), what changes if wrong, nearest lines.
- `check` printing `no gap` is the minimum: read each name as a newcomer would.

## Output

`CapabilityGroup`, `CrossCuttingConcern` and `Fact` lines appended to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`; `describe-shape.ts` first. Correct one by appending it with its id.
