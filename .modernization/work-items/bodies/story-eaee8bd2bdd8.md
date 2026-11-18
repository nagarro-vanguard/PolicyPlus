# Prove the journey: Load a policy file into the user or computer polic...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Bring a policy file into the user or computer policy source.", then the system reads the file and applies it as the difference from an empty file so nothing is forgotten, or says the file could not be loaded and changes nothing..
- Given the product is ready, when the test does "Know that the result is held until saved.", then the system says the import succeeded and keeps the change in memory until the person saves..

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
