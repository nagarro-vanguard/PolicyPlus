# Prove the journey: Save the policy settings and comments to their sou...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Save my changes", then the system saves comments, writes each fully writable source (otherwise reporting it is not writable), makes the changes take effect where possible, and remembers the chosen sources, using the same rules for every source kind and file encoding..
- Given the product is ready, when the test does "Know the outcome of each source", then the system reports success with a line per source, such as saved, already applied, will apply later or discarded, or failure with the reason..

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
