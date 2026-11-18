# Prove the journey: Load a folder of policy definitions into the works...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Choose the folder of definitions to load.", then the system lists the standard folder and, only when it exists on a joined domain, the domain folder, alongside the person's own; it checks the folder exists and refuses one that does not..
- Given the product is ready, when the test does "Say whether to replace what is already loaded, only when something is loaded.", then the system proposes replacing, and does not ask when nothing is loaded..
- Given the product is ready, when the test does "Get the definitions loaded.", then the system empties the workspace first only when replacing, adds the folder, reports problems without stopping, and on failure says the folder could not be fully added with the reason; it remembers the folder only when replacing succeeded..
- Given the product is ready, when the test does "Cancel at any time.", then no folder is chosen..

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
