# Prove the journey: Change the data of an existing value in a policy f...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Pick the value and type its new data", then shows current data, in both decimal and hexadecimal for numbers; text and lists are entered as such; backing out leaves it as it was..
- Given the product is ready, when the test does "Let the system read the number, then keep the change", then reads hexadecimal when marked as such and decimal otherwise; a hexadecimal too large becomes the largest allowed value; text that is not a number leaves the value unchanged; otherwise replaces the data, keeping name and kind and leaving the value selected..

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
