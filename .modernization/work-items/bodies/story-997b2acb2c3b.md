# Prove the journey: Bring a set of policy settings in from a semantic ...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Bring in the text, from a file or entered.", then reads it straight away and states the count of policy settings or the line and reason of the first fault; replaces earlier text, and drops any earlier result..
- Given the product is ready, when the test does "Apply what was read.", then offers apply only for a text that read correctly, then writes, skips and counts failures per policy and reports the outcome..

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
