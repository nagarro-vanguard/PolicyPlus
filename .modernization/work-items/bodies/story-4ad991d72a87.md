# Set up the codebase and its layers

## Problem

- every later story can be built, checked and proven in a layer of its own

## Goal

- a codebase that has every planned layer, each with a check that runs and passes

## Acceptance criteria

- Given a fresh checkout, when the check of the Contracts layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Domain layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Database layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the API service layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the UI components layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Web app layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the End-to-end tests layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Tooling layer runs, then it passes and leaves its results where the delivery reads them.
- Given the codebase, when its layers are listed, then every planned layer appears with its folder and the layers it may reach.

## Scope

- the workspace root
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
