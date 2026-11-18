# Prove the journey: Browse the products and their versions that the lo...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "See every product with how many children it has.", then lists all products ordered by name with child counts..
- Given the product is ready, when the test does "Open a product to see all its major and minor versions together.", then shows major versions ordered by version, and under each its minor versions ordered by version, headed by the names; with nothing chosen, invites a choice..
- Given the product is ready, when the test does "Read the details of any product, version, child or parent.", then shows the details of the chosen item in place, moving to children or parent as asked, and does nothing when none is chosen..

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
