# Export settings to a registry text file

## Problem

- People can save policies as a registry text file to share or import, and must be told plainly when a file cannot be read back.
- Open point: Applying a newer policy file over an older one to a registry export file fails for any dropped value under a policy branch; should the target keep this failure or support it?

## Goal

- Collect the settings destined for an exported registry text file, limited to a branch, and refuse every read or check.

## Acceptance criteria

- Given a registry export file, when a value is checked for deletion, then the request fails with 'not implemented'.
- Given a registry export file, when a value is read, then the request fails with 'not implemented'.
- Given a registry export file, when a key's values are listed, then the request fails with 'not implemented'.
- Given a registry export file, when presence is asked, then the request fails with 'not implemented'.
- Given a registry export file, when a value is forgotten, then the request fails with 'not implemented'.
- Given a value is saved, when a branch is set and its key lies outside it, then it is ignored; with no branch every key is accepted, and any value under that name is replaced.
- Given a value is deleted, when a branch is set and the key lies outside it or the key is already marked for removal, then it is ignored; otherwise the value is recorded as deleted.
- Given a key is cleared, when a branch is set and it lies outside, then it is ignored; otherwise its earlier entries are replaced by a key-removal entry.

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

- Registry export file: A registry text file made to import settings elsewhere; not a policy file.

## Out of scope

- Anything a later story builds on top of this.
