---
name: write-acceptance-tests
description: Writes the tests that prove each acceptance criterion, from the criterion's words and its path rather than from the proposed code, each in the layer that proves it: the test layer that owns it, or, when no test layer reaches the criterion, the code layer beside its source, or a command check.
---

# Write Acceptance Tests

Also takes `changesPath` (the proposed code changes), `changedFilesFolder` (the proposed files at their paths) and `filesFolder` (each test file at its path in the codebase).

## Work

Leave the codebase untouched until the approver agrees, and name what only a run could settle.

Prove each criterion with one test, through its way in, in the cheapest test layer whose AGENTS.md covers it, as that layer says, titled by the behaviour the criterion states, in plain words with no criterion number or work item id, the same title recorded in its `AcceptanceTest`, so its result is credited to the criterion (`../references/codebase-contract.md`, "Test results the skill reads"). Take expected values from the criterion or the test's own data, never from the code's formula. Follow the profile for what the kind's proof must show, and cite in `proves` the facts of the orientation a test shows still hold.

A test earns its place only when it proves a behaviour a person or a client depends on and nothing cheaper would catch (a type, a lint rule, the framework or another test); how a screen looks is never a test.

When no test layer reaches a criterion, test it in the code layer that owns it, beside its source, against the proposed code's real functions, or, where the layer keeps a black-box suite that drives the running product, in that suite; it is committed with the code. A journey's tests go in the file the codebase names for the journey the story states. When no test runner reaches it (infrastructure, a command-line tool's exit status), write the `AcceptanceTest` with a `command` and its `layer` in place of a `file`; exit 0 proves it.

A load, speed or error target has a `LoadThreshold` naming its scenario file. Every other file a layer needs, such as its configuration, has a `TestSupportFile`.

## Output

The test files under `filesFolder`, and the records appended to `outputPath`.
