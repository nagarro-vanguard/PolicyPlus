# Replace live registry changes with the registry source model

## Problem

- The same edits work on a registry source without touching a real machine registry.

## Goal

- Give the registry-style source its delete, forget and clear behaviour in the Domain, filled from imported files.

## Acceptance criteria

- Given a value is deleted and its key does not exist, when the deletion runs, then nothing happens and no error is raised.
- Given a value is forgotten in a registry source, when it runs, then the value is deleted, as a pending deletion cannot be remembered.
- Given a key is cleared in a registry source, when it runs, then every value in it is deleted, the key and subkeys stay, and forgetting a clearance does nothing.

## Scope

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
