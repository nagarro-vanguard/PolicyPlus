# Prove the journey: Find policies whose title, description or comments...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Say the words or phrases remembered.", then searches title, description and comments of both areas by default, and shows results as words are given; says plainly when words are needed and when a quote was never closed..
- Given the product is ready, when the test does "Narrow where the words are looked for, if wanted.", then limits the search to the chosen places and never allows none..

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
