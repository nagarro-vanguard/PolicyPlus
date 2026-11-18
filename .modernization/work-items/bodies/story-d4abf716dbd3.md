# Open another user's stored settings file as a source

## Problem

- People can edit the policies of a user who is not signed in, and the machine must be left as it was.

## Goal

- Load a user's stored settings file into the machine under a temporary name and unload it when the source is released.

## Acceptance criteria

- Given a user's stored settings file, when it is used as a source, then it is loaded under a fresh temporary name after the backup and restore rights are switched on, by the service on the person's machine.
- Given the file cannot be opened after loading, when the source is used, then it silently becomes an empty read-only scratch source.
- Given a source is closed, when it is a mounted user hive, then it is unloaded and the result tells whether that succeeded; every other kind of source closes successfully.

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

- User hive: A user's stored settings file; not the live settings of the signed-in user.

## Out of scope

- Anything a later story builds on top of this.
