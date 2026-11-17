---
name: brief-the-system
description: Groups the system's capabilities into the few areas its people would name - each area with what its capabilities do together - names and judges the shared blocks many capabilities lean on, names the screens its people work in, and chooses the pictures a reader needs from the menu the records can draw, so anyone deciding about the system sees how what it offers falls into parts, and what cuts across them, before any detail.
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
- Every `screen` line in exactly one `Screen`: name what a person works in as the people using the system would say it (Book a flight, Manage aircraft), never a file or class name; a page's markup, code behind and script are one screen, so put such candidates in one record; its `purpose` says what a person does there; `kind` is `screen` for a page, window or dialog, `other` for what a person starts that is no screen (a command, a build or install step, a test). Read the files where the lines do not tell.
- Pictures: you are the one who sees the whole system, so decide which pictures a reader needs to understand it, in a veteran architect's order, and write a `Figure` for each, from the `menu` lines only (what the records can draw): `parts` (what it is made of), `integration` (what it reaches outside itself, and how), `states` (how a kind of data changes over time; one per kind of data a reader would ask about, or one for several), `data` (which capabilities keep which kinds of data), `layers` (how the code is layered). Each has the question a reader has that it answers, the records to draw (empty draws all the menu line offers), and a caption saying what to take from it in plain words, with no number: the page counts. Skip a shape that would answer no reader's question, and never draw a shape for the sake of it. A picture a reader needs that the menu lacks is an `other` figure with `wanted` saying what it would show; it is listed and not drawn.
- An unsupported area is believed; areas restating names explain nothing.
- Search the brief by data, part and purpose to compare capabilities that belong together; open the code, or `analysisRequestPath`'s Supporting Material, where a purpose is unclear.
- Where records point two ways, choose and write the choice as an assumed `Fact` about the system, `aspect` `composition`: why, what would confirm it (`material`, `runningSystem` or `decision`), what changes if wrong, nearest lines.
- `check` printing `no gap` is the minimum: read each name as a newcomer would.

## Output

`CapabilityGroup`, `CrossCuttingConcern`, `Screen`, `Figure` and `Fact` lines appended to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`; `describe-shape.ts` first. Correct one by appending it with its id.
