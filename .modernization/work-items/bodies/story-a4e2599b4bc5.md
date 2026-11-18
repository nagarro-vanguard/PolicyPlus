# Open policy sources, load their comments and report the result

## Problem

- People know what was discarded, which comments are available and whether everything can be saved.

## Goal

- Open the user and computer sources together, close the previous ones first, load each source's stored comments and tell the person how it went.

## Acceptance criteria

- Given sources are already open, when new sources are opened, then the old ones are closed first and unsaved changes are discarded for file-backed and empty sources, while registry-style sources lose nothing.
- Given a source is opened, when its comments are loaded, then they come from the comments stored with that source (filled by importing a CMTX file), no folder or file location is created or read, a source with none stored has no comments yet, and any failure leaves the source without comments.
- Given a comment file, when it is read, then it is refused as unreadable if it lacks a comment-definitions section, has a namespace entry without a prefix, a comment without a policy reference, a text without an id, or repeats a prefix, policy reference or text id, and its comments are unavailable.
- Given sources have just opened, when either is not fully writable, then the person is told 'Not all policy sources are fully writable.' with the state of the user and computer source; when both are writable the confirmation appears only if opening was not quiet, never at start.

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
