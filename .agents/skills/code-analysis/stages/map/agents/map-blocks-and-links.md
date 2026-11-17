---
name: map-blocks-and-links
description: Maps one job's lines by coordinate: blocks, links, shapes of data.
---

# Map Blocks And Links

Goal: pages, capabilities and entities follow your links from each entry point to another entry point or an external system.
Tools: `<scriptsCommand>/map-codebase.ts check <jobId>`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, `<scriptsCommand>/find-files-in-scope.ts <part of a path>` (lists the files in scope, the only files you may cite), Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): what every `file` in a record is relative to.
- `jobId` (required): the job, for its check.
- `jobPath` (required): your windows: the files and lines you map, each record starting in them; read every line.
- `briefPath` (required): where a block starts and ends, and the facts on the parts and technologies your windows touch.
- `registryPath` (required): the registries by record id: layers, code kinds (`kind`, `membershipRule`), external systems.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last output: `<scriptsCommand>/map-codebase.ts carry <jobId> [record ids]` copies its records but those that fall; write what it changes.

## Work

- Name places by coordinate (`file`, first and last line), never copied text. Every non-blank line of `jobPath` sits in a `Block`, a `DataDefinition` (a shape of data) or a `Span`; a window starting inside an earlier job's block leaves those lines to it. Read `briefPath` first. A block takes the code kind in `registryPath` whose `membershipRule` it meets, by record id; none fits: write the `CodeKind`.
- An entry point is where control or data enters the system's code from something that is not that code's own flow: a host, framework, scheduler, runtime or another process calls it, including a handler a person triggers. The test is who starts it and whether we hold the starter's source: code we hold that starts it makes it a step of that code's flow, and a starter we do not hold makes it an entry point. For an entry point give `startedBy`, `reachedBy`, `purpose` (one line) and `evidence`, the lines that show it.
- Each place work leaves your lines (call, request, display, data saved or read, wiring) has one `Link` per target the code proves, at the call site; a registration that wires code to what starts it (a markup attribute, a route table, an annotation, a configuration entry, a dependency-injection binding, a schedule or batch-control line, a subscription) is a `call` link at the registration line, naming the code it starts, naming any line inside the block reached. An external system is its registry entry or the `ExternalSystem` you write; `fieldsUsed` go where data moves. Where the code does not show a target, `unresolvedTarget` says what it shows and what would show more.
- Where the code shows that a block can run in place of another (an override, an implementation of an interface or protocol member, a registered handler for a member), the stand-in has one `dispatches` link at the lines that show it, pointing at a line inside the member it stands in for; an interface or abstract member is itself a block. Never write a `dispatches` link at a call site, and never guess one where the stand-in is not shown.
- A name the code uses to start work elsewhere (a command name, a topic, an address) may be defined in code in scope. Find where with Grep, then confirm each file holding a definition with `find-files-in-scope.ts <part of its path>`: a file that tool does not list is not in scope, and a definition only there is not one. Write a link to a line inside each definition in scope, one link per definition, and the external system only where none is in scope. What a link names in a data store is data (a table, a collection, a queue); code that runs in or behind the store, whose source is in scope, is a part, never the store.
- Lines that hold behaviour, or name where work goes, are a `Block`, never a `DataDefinition`, even in a declaration file or a file of generated text; only a registration that wires code to what starts it may be a `Span` holding a link.

## Output

Records with `append-agent-records` (one JSON line each on standard input, or `--from <file>`). Correct a record by appending it with its id. `check` printing no gap is the minimum. With nothing to record, run it once with none: it creates `outputPath`.
