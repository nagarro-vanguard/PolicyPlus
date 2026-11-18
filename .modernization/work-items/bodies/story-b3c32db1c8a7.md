# Prove the journey: Merge identical user and computer policies into si...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "See which user and computer policies are identical.", then lists each pair that is alone in the same category under the same name with the same explanation text and stored-setting location..
- Given the product is ready, when the test does "Confirm the merge.", then removes the first of each pair and makes the second apply to both sections, then states how many policies were deduplicated..

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
