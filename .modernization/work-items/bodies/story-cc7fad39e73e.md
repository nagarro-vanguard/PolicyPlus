# Prove the journey: See what a policy is, which section it applies to,...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Open a policy and see its section, place and support in one view.", then shows the section name, the category name or its orphaned/uncategorized marker, and the support definition name or its missing marker, flagging each gap..
- Given the product is ready, when the test does "Go to the category or the support definition it names.", then takes the person to the existing category or support definition; where it is unknown or missing, going there is unavailable..

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
