# Places: tests, build and release

Given to the briefing agent when the system has tests, build files or tools (a part of kind `tests` or `tool`, or a candidate of kind `test`, `buildStep` or `command`).

## Detection signals

- A part of kind `tests` or `tool`; build files (project files, build scripts, container files); scripts an operator runs.

## What counts as a place

- Test suites are grouped by script, one per test file, and never named: they are shown as what reaches the product's rules, never as places on a capability's path.
- A build file or a release script is a build step; a script an operator runs by hand is a command.

## How to choose the kind

- `buildStep` for building, versioning, installing or releasing the system; `command` for operating it by hand. Neither is part of the product a reader works with.

## Nouns

- `build step` / `build steps`, `command` / `commands`, `test suite` / `test suites` from the catalogue.

## Words to avoid

- Maven goal, MSBuild target, fixture, harness, runner.

## Known traps

- A test runner starts tests: the Map may record them as started by another system. They are tests, never a service.
- Release material is never a capability's place; it sits under how the system is built and run.
