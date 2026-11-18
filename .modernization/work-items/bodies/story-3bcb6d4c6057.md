# Prove the journey: Inspect the technical makeup of a policy: its stor...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Open a policy and get a plain summary of what it stores and where.", then opens the inspection with a short summary drawn from the stored setting; the stored value and client extension are included only when the policy names them..
- Given the product is ready, when the test does "Ask for the presentation and element detail.", then lists presentation details when there is both a presentation and elements, matching items to elements by ID and reporting a missing element; choice names from the defining file numbered from zero; list value naming stated; groups left implicit or to elements read as defined..
- Given the product is ready, when the test does "Ask for the semantic text of the policy.", then writes one section per area it applies to (C or U then identifier), comments only when stored, settings and options only when Enabled, in the semantic format with backslashes doubled and CR LF as \n, flagging text that cannot be read back safely..
- Given the product is ready, when the test does "Copy a line.", then copies the selected line only when one is selected..

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
