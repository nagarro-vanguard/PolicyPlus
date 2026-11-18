# Keep policy comments with their source and read comment files

## Problem

- Comments must stay with their source and a damaged file must not give partial comments.

## Goal

- Domain rules (with comments stored by Data next to the policy state they belong to) for where a source's comments live and when a comment file is unreadable; a comment file (CMTX) is only imported and exported (integrations.decision-6).

## Acceptance criteria

- Given a source, when its comments are kept, then they are stored with that source in Data and not in any file beside it; when exported as a comment file, it is named like the source's file with the extension .cmtx, or comment.cmtx for the local or a user's Group Policy source; a registry source has no beside-the-file location and its export name is chosen at download; Scratch space has no comments, so comments are unavailable.
- Given a comment file where any policy reference has no colon or an undeclared prefix, text is not "$(resource.<id>)", a text id is missing or two comments resolve to the same policy, when it is read, then no comment is read.
- Given the comments of a source, when they are exported as a comment file and imported again, then the same comments come back and the text is byte-faithful where the format allows.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Terminologies

- Comment file: A CMTX file holding the comments written on policies; here an import and export format, not where comments are kept.

## Out of scope

- Anything a later story builds on top of this.
