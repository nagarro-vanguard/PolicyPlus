# Set up the codebase and its layers

## Problem

- every later story can be built, checked and proven in a layer of its own

## Goal

- a codebase that has every planned layer, each with a check that runs and passes

## Acceptance criteria

- Given a fresh checkout, when the check of the Tooling layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Domain layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Contracts layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Data layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Services layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Components layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Screens layer runs, then it passes and leaves its results where the delivery reads them.
- Given a fresh checkout, when the check of the Black-box tests layer runs, then it passes and leaves its results where the delivery reads them.
- Given the codebase, when its layers are listed, then every planned layer appears with its folder and the layers it may reach.

## Scope

- the workspace root
- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Out of scope

- Anything a later story builds on top of this.
