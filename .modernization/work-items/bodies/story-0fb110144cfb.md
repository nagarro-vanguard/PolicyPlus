# Load policy definitions from a folder or...: Definition load coordinator

## Problem

- People can only browse and edit policies once their definitions are loaded, and they need to know when something in them could not be used.

## Goal

- Read the administrative template and language files from a chosen folder, or add a single template file, and build the policies and categories people browse.

## Acceptance criteria

- Given a load that finds no problems, when it finishes, then nothing is shown; given problems, then the person sees "Errors were encountered while adding administrative templates to the workspace." with each problem and is asked "Continue trying to use this workspace?" only where a choice is wanted.
- Given policies already loaded, when the person adds one template file, then that file alone is added to them, the structures are rebuilt, and a refused file is reported as one failure.

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
