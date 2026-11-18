# Prove the journey: Make each built copy of the program carry the vers...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Build or release a copy of the program.", then works out the version from the code the copy is built from: the tag, commit count and short commit name when tags exist, a short commit name otherwise..
- Given the product is ready, when the test does "Know which code this copy came from.", then records that version in the copy only; the committed source keeps an empty version..

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
