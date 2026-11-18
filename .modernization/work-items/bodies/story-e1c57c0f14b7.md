# Hold a policy file's settings in memory and answer questions about them

## Problem

- Applying policies and checking what a file says depend on these answers being exact, including what is marked for deletion.

## Goal

- Keep the entries of one policy file and answer whether a value is present, read it, set it, forget it, mark it for deletion or clear a key.

## Acceptance criteria

- Given a policy file, when a value is checked, then it counts as marked for deletion when a deletion marker, a clear-all marker or a delete-values list names it, regardless of case, and a later-sorting value of that name cancels the deletion.
- Given a key, when its values are listed, then marker entries are left out unless the caller asks for them.
- Given a value that is absent or marked for deletion, when it is read, then nothing is given.
- Given a value, when its presence is asked, then it counts as present only if it is stored and not marked for deletion.
- Given an expected deletion marker, number or text, when presence is tested, then it is present if marked, an equal whole number, or equal text; a value of the wrong kind is not present.
- Given a value, when it is marked for deletion, then anything held under that name is dropped and a marker holding 32 is added unless already marked or its key is cleared.
- Given a value, when it is set, then it replaces any value under that name and a deletion marker for the name is kept.
- Given a value, when it is forgotten, then both the value and its marker are removed so the policy says nothing about it.
- Given a key, when it is cleared, then all values and markers under it are dropped and a single clear-all marker is stored.

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

- Marked for deletion: A value the file says should be removed on the machine; not a value that is merely absent.

## Out of scope

- Anything a later story builds on top of this.
