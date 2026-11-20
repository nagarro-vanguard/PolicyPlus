---
name: brief-the-system
description: Groups the system's capabilities into the few areas its people would name - each area with what its capabilities do together - names and judges the shared blocks many capabilities lean on, names every place the system is worked with through and gives each its kind, writes the system's name and the terms a newcomer needs, and writes the views a reader needs (what it does, what it is made of and, when known, where it runs), so anyone deciding about the system sees how what it offers falls into parts, and what cuts across them, before any detail.
---

# Brief The System

Goal: the system page lists what it offers under your areas, read by people who will never open the code, and every capability page names its area: a wrong area misleads every reader, and a shared mechanism left unnamed is one a rebuild of a single capability would miss.
Tools: `<scriptsCommand>/publish-pages.ts check`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `briefPath` (required): the system's size, build, purpose, parts and external systems; then a line per capability holding an entry point: who starts it, what it does first, its parts, data, external systems, and the capabilities sharing its data; a `candidate` line per block that many capabilities share and that is called from more than one layer; a `screen` line per candidate place, whoever starts it, with the kind and name the code suggests; a `kind` line per kind of place with its nouns. Search it; it may be large.
- `guides` (required): the guides on naming places this system's media need, chosen by script; read each before naming a place.
- `analysisRequestPath` (optional): the request; its Supporting Material lists documents beyond the code.
- `outputPath` (required): where your records go.
- `customInstructions` (optional, last): feedback on your last briefing: first `<scriptsCommand>/publish-pages.ts carry "the briefing" [record ids]` copies its records, leaving out those that do not stand; then write only what it changes.

## Work

- Areas a person running the system would name, each a `CapabilityGroup` of capabilities serving one purpose together, its purpose saying what they do together, every capability of `briefPath` in exactly one.
- Every `candidate` line in exactly one `CrossCuttingConcern`: read the block and the blocks it works with, name what they do together in the product's own words, say which parts lean on it, and judge it. `crossCutting`: a mechanism the whole system leans on whatever the business thing is (access control, language lookup, logging or audit, error handling, configuration, validation, caching, transactions). `sharedDomain`: code of the business itself that several capabilities use. `neither`: a helper that serves no concern. Blocks that serve one concern are one record. Name no block that is not a candidate. A brief with no `candidate` line gets no `CrossCuttingConcern`.
- A concern the code applies without a call (an attribute, a setting, a framework rule) leaves no candidate: where you see one, write it as an assumed `Fact` about the system, `aspect` `composition`, with the nearest lines, so it is not lost.
- Every `screen` line in exactly one `Screen`, as `guides` say: name the place as the people using it would (Book a flight, Ping weblog sites each night), never a file, class or method name, which the check refuses; its pieces (a page's markup, code behind and script) are one record; its `purpose` says what is done there; its `kind` comes from the `kind` lines only, starting from the line's suggested `kind`. What no reader visits is `other`. Test suites have no line and get no record. Read the files where the lines do not tell.
- One `SystemWords` at most: `name` only when the brief, the code's own titles or `analysisRequestPath`'s documents name the system (at most five words, found in the brief); `terms` only for product words a newcomer would stop at that the brief uses, each `means` under twenty-five words without the term. Kinds of data need no term.
- Views: write a `View` for each picture a reader needs, in a veteran architect's order: `functional` (what the system does for its people and how that divides), `technical` (what it is made of and how the parts work together) and, only when the facts say where and how it runs, `deployment`. A view is a question, a caption with no number, boxes (one holds others through `group`; a box may cite records from the `known` lines) and arrows; choose what to draw and what to call it.
- An unsupported area is believed; areas restating names explain nothing.
- Search the brief by data, part and purpose to compare capabilities that belong together; open the code, or `analysisRequestPath`'s Supporting Material, where a purpose is unclear.
- Where records point two ways, choose and write the choice as an assumed `Fact` about the system, `aspect` `composition`: why, what would confirm it (`material`, `runningSystem` or `decision`), what changes if wrong, nearest lines.
- `check` printing `no gap` is the minimum: read each name as a newcomer would.

## Output

`CapabilityGroup`, `CrossCuttingConcern`, `Screen`, `SystemWords`, `View` and `Fact` lines appended to `outputPath` with `append-agent-records`, one JSON line each on standard input, or `--from <file>`; `describe-shape.ts` first. Correct one by appending it with its id.
