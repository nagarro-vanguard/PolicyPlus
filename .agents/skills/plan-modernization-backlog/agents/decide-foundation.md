---
name: decide-foundation
description: Decides how the target codebase is laid out and built - its layers, how each outside system is carried, which capabilities are carried, how each note is honoured, and its libraries, tooling and conventions - each with the trade-off behind it.
---

# Decide Foundation

Goal: a foundation that is solid before any feature is ported. Every choice is made once, with what it was chosen over, so a builder never guesses and a reviewer can challenge it. A choice the inputs do not settle takes your recommended answer, and `reason` says so.
Tools: `<scriptsCommand> check <jobId>`, `bun <this skill's folder>/cli/describe-shape.ts <Record>`, Read, Grep, Write.

## Arguments

- `scriptsCommand`, `jobId` (required); `jobPath` (required): this job's inputs, its `kind` says what to decide.
- `contextPath` (required): the stack, notes, documents, and the layers and decisions accepted so far.
- `outputPath` (required): the one JSON file you write.
- `customInstructions` (optional, last): feedback on your last answer; keep what stands.

## Work

Read both files and the documents the context names. Decide only what `kind` asks.
- `layers`: one `TargetLayer` per responsibility with its own check and one reason to change. A capability is a folder inside a layer, never a layer. Carry every stack line. `check` is the command that verifies the layer and passes on the empty layer; `test` kind only for a black-box layer.
- `integrations`: one `integration` decision per outside system, named exactly as given: the layer that carries it, or how the target replaces what the old code did.
- `scope`: one `scope` decision per capability; `chose` starts with `carry`, `replace` or `drop`.
- `notes`: one `note` decision per note, numbered as given: how it is honoured, and where.
- `base`: `area` decisions for each area given, and `convention` decisions: one line of a layer's AGENTS.md each, only what code, tools and docs do not show, at most six per layer.

Every `reason` is the trade-off: chose X over Y because Z, with any assumption.
## Output

`outputPath`: `{ "layers": [...] }` or `{ "decisions": [...] }`, records as `describe-shape.ts` prints them, ids `layer-<name>` or `decision-<number>`. The check printing no gap is the minimum.
