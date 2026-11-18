# Prove the journey: Set one policy to Enabled, Disabled or Not configu...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Open the policy with everything already worked out", then the system fills in the policy's description, applies to side, state and stored options, defaults and comment, and shows whether this side can be written to..
- Given the product is ready, when the test does "Say what state it should be in and change only what differs", then the person picks on, off or not configured and edits only the options that need to change; the system keeps values within limits and refuses duplicate list names..
- Given the product is ready, when the test does "Review the forecast of changes", then the system lists what will be forgotten, written and removed, including whole list keys and values taken away by Disabled, and what the comment will become..
- Given the product is ready, when the test does "Confirm, then carry on or finish", then the system applies the forecast, reports the outcome as a change if anything was saved in this visit, and keeps the person on the policy or closes it..

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
