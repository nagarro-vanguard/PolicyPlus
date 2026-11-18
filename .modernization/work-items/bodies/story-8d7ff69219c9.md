# Prove the journey: Remove keys or values from a policy file, either l...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Mark the selected value for deletion", then takes the value's name from the selection and replaces the value with a deletion entry named "**del." and the name..
- Given the product is ready, when the test does "Choose what to do with a selected key", then offers clear everything, clear then keep existing ordinary direct values, or delete one value by typed name; nothing is chosen at first, none chosen does nothing, an empty name is refused, and backing out changes nothing..
- Given the product is ready, when the test does "Forget an entry entirely", then describes what will go and asks for confirmation; removes the key, sub-keys, values and clearing marks, or the value and its deletion entry, with nothing left behind..

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
