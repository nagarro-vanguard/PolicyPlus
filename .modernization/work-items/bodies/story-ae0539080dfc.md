# Prove the journey: Choose a user profile whose stored settings are to...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Accept or replace the proposed profile", then the system proposes the profile of the person using the program, lists the others, and does nothing until one is selected and confirmed..
- Given the product is ready, when the test does "Leave without choosing", then the system closes the choice with nothing chosen and the current source unchanged..

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
