# Prove the journey: Bring the contents of an exported set of machine s...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Choose the exported machine settings and the policy source (user or computer) they should be brought into.", then the system accepts only exported-settings files and remembers the chosen source..
- Given the product is ready, when the test does "Be told what the file contains and how its keys will be named in the source.", then the system checks the file is a genuine export, ignores blank and comment lines, reads keys, removals, deletions and default values, works out the key prefix from the first key, and warns when the file holds default values or the prefix could not be worked out..
- Given the product is ready, when the test does "Give a prefix only if the system could not decide one.", then the system refuses to continue without a file or a prefix and says which is missing..
- Given the product is ready, when the test does "Bring the settings into the source.", then the system removes marked keys, deletes marked values, saves the others with the prefix removed from names, tells the person only that the import failed if it does, then refreshes what the person sees..
- Given the product is ready, when the test does "Leave without importing.", then the system changes nothing..

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
