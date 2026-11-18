# Prove the journey: See a category, its parent and how it relates to p...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Open a category and see where it sits in the whole tree.", then shows the category with its chain of parents and the policies it holds; a missing parent shows "<orphaned from <parent>>" and ends the chain, a top-level category shows no parent..
- Given the product is ready, when the test does "Jump to any parent in the chain.", then shows that parent's details; a missing parent is not followable..

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
