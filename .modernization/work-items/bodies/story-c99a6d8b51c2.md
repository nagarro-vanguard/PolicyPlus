# Prove the journey: See which policy template files are loaded and wha...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "See which files are loaded and roughly what each contributes.", then the system lists the loaded files with the number of policies, categories, products and support rules each defines..
- Given the product is ready, when the test does "Look closer at one file.", then the system shows exactly what was defined in that file, for a chosen file only..

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
