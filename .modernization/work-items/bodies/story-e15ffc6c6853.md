# Stamp the program with its Git version at build time

## Problem

- The new build has no compile step needing a generated file, and a committed generated file goes stale.

## Goal

- The build records the current Git version in a value the service reports, in place of generating a version source file.

## Acceptance criteria

- Given a build from a Git commit, when the service is asked for its version, then it reports that commit's version.
- Given the repository, when it is checked, then no generated version source file is committed.

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Out of scope

- Anything a later story builds on top of this.
