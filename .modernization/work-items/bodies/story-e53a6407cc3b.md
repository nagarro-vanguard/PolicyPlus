# Read and write remembered preferences in the preference store

## Problem

- Remembered choices must survive between runs, yet an unreachable store must never stop someone from working or interrupt them with alerts.
- Open point: Existing settings in the old Windows registry location are not carried over; should a one-time import of them be planned?

## Goal

- Give the program one place to read and write named preference rows in the preference store, which carries on with defaults when it cannot be reached.

## Acceptance criteria

- Given the preference store is reachable, when a named preference is saved and read back, then the saved value is returned.
- Given the preference store cannot be opened or created, when preferences are read, then they read as their defaults.
- Given the preference store cannot be opened or created, when the person changes a preference, then the change is dropped and nothing is remembered at the next run.
- Given the preference store cannot be reached, when the program carries on, then the person is not told.

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Terminologies

- Preference store: The place where the program keeps the person's remembered choices between runs; it is not the policy files being edited.

## Out of scope

- Anything a later story builds on top of this.
