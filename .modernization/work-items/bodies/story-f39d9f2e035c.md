# Stamp the program with its Git version at build time

## Problem

- Support and people reporting problems need to know exactly which build they run, without anyone typing a version by hand.

## Goal

- When the program is built, work out its version from the source history and make it available to the running program, leaving the committed source with an empty version.

## Acceptance criteria

- Given the source history has tags, when the build script runs, then the program's version is the tag, the commit count and the short commit name.
- Given the source history has no tags, when the build script runs, then the program's version is the short commit name.
- Given someone runs the build script or the release workflow runs it, when it finishes, then the version replaces the empty one in what the program reports.
- Given the source is committed, when its version is read, then it is empty, because only a build carries a version.

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
