# Provide an empty scratch source and policy files on the machine

## Problem

- People can practise or prepare changes without touching anything, and can point the program at real policy files without them having to exist first.

## Goal

- A Scratch space source starts empty and is never saved, and policy files and their folders on the computer are read, created empty when missing, and opened for reading and writing.

## Acceptance criteria

- Given a Scratch space source is chosen, when the person works with it, then it starts empty, can be changed, and is never saved anywhere.
- Given the policy file of a POL file source, the local Group Policy or a per-user Group Policy does not exist, when the source is opened, then it is created empty with its folder and treated as writable, so a mistyped SID creates a new folder and empty file under the per-user policy folder; if creation fails, an empty read-only source is used and no error is shown.
- Given a POL file, the local Group Policy or a per-user Group Policy that already has a file, when the source is opened, then the file is loaded and is writable only when it can be opened for reading and writing; otherwise it can be viewed but its changes cannot be committed.

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

- Scratch space: A source that starts empty, can be changed and is never saved; it is not a file or the registry.

## Out of scope

- Anything a later story builds on top of this.
