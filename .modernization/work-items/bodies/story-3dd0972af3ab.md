# Read and write registry policies and user hives safely

## Problem

- Registry editing must work on Home editions without a compiled add-on and must not allow typed keys to run commands.

## Goal

- The service reads and writes policy keys, and loads and unloads user hives, through one registry port that the rules see only as plain data.

## Acceptance criteria

- Given a policy key, when it is read or written, then the service uses the built-in Windows tools behind one registry port and the domain sees only data.
- Given a user hive that is not loaded, when the person chooses it, then it is loaded and later unloaded through the same port.
- Given a typed key path or account name, when it is used, then it is checked against the contract schema first and passed to the tool as separate arguments, never as a built command string.
- Given machine policy is written without administrator rights, when the write is refused, then the answer is a named no-rights outcome.

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
