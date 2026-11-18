# Prove the journey: Add a single policy template file to the policies ...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Choose the policy template files to add.", then the system accepts only template files, one or several..
- Given the product is ready, when the test does "See what was added and what was refused.", then the system adds each file alone without emptying the workspace or remembering a folder, builds the structures once, and reports each refused file with its reason..

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
