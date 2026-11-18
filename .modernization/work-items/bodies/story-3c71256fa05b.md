# Prove the journey: Find the policies that control a given system sett...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Give whatever is known about the setting in one go, such as a path copied from documentation, a key, or a value name.", then works out which part is the key and which the value, and shows the reading so it can be corrected..
- Given the product is ready, when the test does "See at once whether the terms can be used.", then while the person types, says that nothing has been entered or that a root key must be removed, and does not search until the terms are usable..
- Given the product is ready, when the test does "Get the policies that control the setting.", then shows policies as soon as the terms are usable: a policy matches when one setting it reads or writes meets every term, ignoring case, with wildcard, prefix, whole-name and path-part rules for keys and values..

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
