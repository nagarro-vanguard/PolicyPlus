# Set, delete and forget values and key clearances in a policy file

## Problem

- Edits to a policy file leave it in the same state Microsoft's tools would.

## Goal

- Change a policy file's entries: set a value, mark it deleted, forget it, clear a key and forget the clearance.

## Acceptance criteria

- Given a value is set, when it is stored, then it replaces any value held under that name and a deletion marker for the name is not removed.
- Given a value is marked for deletion, when it is stored, then any held value or marker under the name is dropped and a marker holding 32 is added unless already marked or its key is cleared.
- Given a value is forgotten, when it is stored, then both the value and its deletion marker are removed so the policy says nothing about it.
- Given a key is cleared, when it is stored, then all values and markers under it are dropped and a single clear-all marker is kept.
- Given a key's clearance is forgotten, when it is stored, then every clear-all marker for that key is removed.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Out of scope

- Anything a later story builds on top of this.
