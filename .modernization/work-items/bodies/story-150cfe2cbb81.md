# Resolve where each policy source comes from and whether it can be saved

## Problem

- Every source is opened from a known origin and people are told plainly when changes cannot be kept.

## Goal

- Decide where each kind of policy source gets its content (an uploaded file or stored data, never a folder on the service's machine) and describe whether it can be written, starting a missing source empty.

## Acceptance criteria

- Given a source kind, when its origin is resolved, then a POL file, a local-policy file, a per-user policy object and an imported registry or user-hive file each take the file the person uploads, the service reads no user folder and makes no directory connection, and scratch space has no origin.
- Given no policy file has been uploaded for a source, when it is opened, then an empty source is created in the stored data and treated as writable, nothing is created on disk and no person identifier is looked up, so a mistyped identifier creates nothing; if creating the empty source fails, an empty read-only source is used and no error is shown.
- Given a source, when its writability is decided, then scratch space is writable, a registry-style source is 'no writing' when the write test failed, and others are 'no commit' when the file could not be opened for writing.
- Given a source, when its writability is described, then it reads 'is fully writable', 'cannot be saved' (changes work in memory only) or 'cannot be modified', and anything but fully writable counts as a problem.

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
