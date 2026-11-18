# Prove the journey: Add a new key, or a new value of a chosen kind, to...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Give the new key a name and know at once whether it is usable", then checks as the person types, refusing a backslash or a name already used under the same parent ignoring case; an empty name or backing out adds nothing..
- Given the product is ready, when the test does "Have the key created and selected", then adds the empty key under the selected key or at the top and selects it..
- Given the product is ready, when the test does "Add a value by its name and data together", then takes name and data in one pass; the kind starts as string and is suggested from the data (digits suggest a 32-bit number, several lines a list), stays visible and can be changed; the starting data is empty text, zero or an empty list; stored only on confirming, replacing a same-named value without warning..

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
