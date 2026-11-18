# Prove the journey: Work through the hits of a search and pick the pol...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Watch the policies that match appear as the search goes.", then clears earlier results, starts with a start message, tests every policy in turn, adds each hit with its category in policy order and keeps progress current as it goes..
- Given the product is ready, when the test does "Stop the search once enough has been found, or leave it.", then cancels the search; leaving before it ends marks it as cancelled with progress full..
- Given the product is ready, when the test does "Know how the search ended.", then reports checked policies and hits, or that the search was cancelled, and no longer offers stopping..
- Given the product is ready, when the test does "Pick the policy to open from the hits.", then accepts only a chosen hit, remembers its position, opens that policy's editor in the current area and moves the policy list to it..
- Given the product is ready, when the test does "Move on to the next hit.", then takes the next hit still shown after the last one chosen, says there are no more when none is left, and returns nothing when no search ran..
- Given the product is ready, when the test does "Come back to the last results later.", then shows the previous results without a new search and selects the earlier choice if still present; tells the person when no search has been run..

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
