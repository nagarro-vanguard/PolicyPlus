# Keep the person's remembered choices for the rest of the program

## Problem

- Every part of the program that needs a remembered choice gets it the same way, so choices are kept and returned consistently.

## Goal

- Give the rest of the program typed access to the remembered choices: the chosen sources, the definitions folder, the language, whether the caution was accepted and whether the offer was considered.

## Acceptance criteria

- Given a chosen source, definitions folder, language, caution acceptance or offer consideration is saved, when it is asked for later, then the same choice is returned.
- Given a choice was never saved, when it is asked for, then its default is returned.
- Given the preference store cannot be reached, when a choice is saved or asked for, then the program carries on with defaults and tells no one.

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

- Remembered choice: A decision the person made that the program keeps between runs, such as language or definitions folder; it is not a policy setting.

## Out of scope

- Anything a later story builds on top of this.
