# Prove the journey: Go straight to a known category, product, support ...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Name what is wanted by its identifier and arrive there.", then trims the text, resolves the kind in order and any suffix, then opens it as the outcome rules say, or says it was not found..
- Given the product is ready, when the test does "Read the details of a product or support definition reached.", then states the kind, parent, version, children, and how a support definition matches and lists its entries..

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
