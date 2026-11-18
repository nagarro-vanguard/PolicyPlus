# Prove the journey: Obtain Microsoft's current set of policy definitio...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Get the current policy definitions.", then proposes the operating system's own policy definitions folder as the destination every time and fetches the one fixed Microsoft package..
- Given the product is ready, when the test does "Wait while the definitions are installed.", then locks the destination and the start, prevents leaving while it runs, takes control of an existing destination for an administrator, unpacks the package and removes it, then replaces files in the destination with the templates, the regional-format language files and the English fallback, resetting permissions..
- Given the product is ready, when the test does "Learn the result and use the definitions.", then tells which step failed if any, re-enables everything and reports no new folder; on success removes scratch files and asks whether to open them, reporting the folder only on yes..
- Given the product is ready, when the test does "Install somewhere other than the usual folder, only when needed.", then replaces the destination with the folder chosen; cancelling leaves it unchanged..

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
