# Edit entries of a REG file within its source branch

## Problem

- Registry files can be imported, edited and exported without stray changes.

## Goal

- Save, delete, clear and forget values and keys in a REG file, limited to a source branch when one is set.

## Acceptance criteria

- Given a value is saved, when it runs, then it is ignored if a source branch is set and the key is outside it, otherwise any value under that name is replaced.
- Given a value is deleted, when it runs, then it is ignored if outside the branch or the key is already marked for removal, otherwise it is recorded as deleted.
- Given a key is cleared, when it runs, then it is ignored if outside the branch, otherwise earlier entries are replaced by a key-removal entry.
- Given a key's clearance is forgotten, when it runs, then the key-removal entry is dropped if present, ignored if outside the branch.
- Given a value is forgotten, when it runs on a REG file, then the request fails as 'not implemented', so applying a newer file over an older one fails for any dropped value under a policy branch.

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
