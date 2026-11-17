## Commands
- check: `/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/scripts/map-codebase.ts check job-5321039696722191`
- carry: `/Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/scripts/map-codebase.ts carry job-5321039696722191`

## Rules
# Code kinds: rules

What a code kind and its layer are, how wide a block is, how the registry grows, and its records. Every piece of code the Map reads takes one code kind, so a block too wide, too narrow or split by where it lives makes every Map job's choice arbitrary. The proposing agent, the Map's agents and their reviewer apply these rules, for any stack and any medium.

## Records and commands

- Entries are `CodeKind` records, each in one `Layer`, which the same job writes.
- The registry grows as the Map's jobs write: the lead job, which holds the most kinds of file and parts, runs first and alone, and every later job chooses from what is written and writes the entry it needs where none fits. You merge duplicates once every Map job is decided: `jobPath` is every entry written, beside the registry so far. `briefPath` holds the parts, the technologies, and How it runs' facts on each technology: how its code is recognised, and where a piece of it starts and ends.
- A code kind names its layer by record id; each layer holds at least one code kind. The Map's own jobs assign: every piece of code and data shape names one code kind, of the registry or written by the job (see below).

## A code kind

- A recurring kind of code the system is built from, such as a web page, a web API endpoint, a stored procedure, a batch program or a data class: never one piece of code, never a technology.
- Named in plain words for what it does ("web API endpoint"), never by the code's own marker; the marker (a base type, an attribute, a file suffix) goes in `membershipRule`.
- Its `membershipRule` tells a member in any part of the code, and says what belongs to a neighbouring block instead. Two blocks whose `membershipRule` admit the same piece are one, or one is narrowed.
- One kind, one block, whatever folder, part or language it lives in. Split only where the code does different work: code that runs or code that shapes data, an entry point or a step of a flow.
- An entry point is where control or data enters the system's code from something that is not that code's own flow: a host, framework, scheduler, runtime or another process calls it, including a handler a person triggers. The test is who starts it and whether we hold the starter's source: code we hold that starts it makes it a step of that code's flow, and a starter we do not hold makes it an entry point.
- The code that answers a person's action on a screen (a click, a selection, a submit; in another stack, the equivalent handler) is a code kind of its own, an entry point of an interaction: the screen's markup, configuration or framework calls it, never the system's own flow, so it is never a step of the page's load. Name the kind for what it does ("screen action handler"), and let each handler of it be its own entry point.
- Code that only builds, packages, releases or documents the system (a build script, a release tool, a schema generator a developer runs) starts no business work: it is no entry point, so no capability is drawn from it.

## A layer

- A tier of the system (for example screens, request handling, business rules, data access, data shapes, outside connections, build and release). Each code kind sits in exactly one.
- Each tier is one layer. The lead job writes the layers the system's tiers need, from How it runs' facts on the parts and technologies, before any other job runs; a later job takes the layer of the registry whose tier its code kind belongs to, and writes a new layer only when no layer fits, never one that names a tier a layer already names (two dialogs windows layers, or a "windows" layer beside a "screens" layer for the same tier, split one tier in two on every page).

## What the code cannot settle

- What the code cannot settle about an entry, where a different answer would change a page a person decides from, is an assumed `Fact` about the part holding the lines (or the system), its `aspect` `inside`: why no file settles it, what would confirm it (`material`, `runningSystem` or `decision`), what changes if it is wrong, and the nearest lines. Never a question to the person.

## How the registry grows

- Grown by the Map's jobs from the lead job on, then merged once every Map job is decided, reviewed before it is written. Never frozen.
- A Map job whose piece no block fits writes the block it needs, in an existing layer or one it writes, never a name a block already has; each closed batch adds it to the registry the next batch reads.
- Once every Map job is decided, this job runs once more with the blocks and layers Map jobs wrote: merge each duplicate, of yours or of another written one, into the entry that stands for both, naming it in that entry's `mergedFrom`; keep the rest as written. Nothing is dropped.
- Merge the layers and the code kinds on them together. Layers that name one tier merge into one; the code kinds on a merged layer move to the layer that stands for it (a script rewrites every reference), and a code kind then merges into another of the same kind on the same layer. The check refuses two layers of one name, two code kinds of one name and kind on one layer, and a code kind merged into one of another kind or another tier.

## Read besides
- what earlier stages established: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/brief.json
