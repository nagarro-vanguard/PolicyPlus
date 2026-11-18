# Keep and save policy comments for each source

## Problem

- Administrators can leave notes on policies and trust them to be saved with the source and read back intact.

## Goal

- Comments are kept per policy and area, found when wanted, and saved to the comment file beside the source, which is read and written with a text id and prefix for every comment.

## Acceptance criteria

- Given a policy and an area, when its comment is wanted, then it is empty when the source has no comment file or no comment for the policy, and otherwise the saved text.
- Given a source, when its comments are loaded, then they are used only if it has a comment file location; the folder is created if missing, an existing file is loaded, a missing file gives no comments yet, and any failure leaves that source without comments.
- Given a source's comment list exists, when comments are saved, then the list is written to its comment file location even when empty, and a source without comment support has no list and is skipped.
- Given a comment file, when it is read, then it is refused as unreadable and the source's comments become unavailable if it has no comment-definitions section, a namespace entry without a prefix, a comment without a policy reference, a text without an id, or a repeated prefix, policy reference or text id.
- Given a comment file, when the comments are read, then none can be read if any comment's policy reference has no colon or a prefix that is not declared, its text is not written as "$(resource.<id>)", its text id is missing, or two comments resolve to the same policy.
- Given comments held in memory, when they are saved, then every comment and text is written into the target file in schema version 1.0, replacing what the file held before.
- Given comments being saved, when the file is written, then each comment gets its own text id built from the policy's namespace, policy name and a running number, and each distinct namespace gets a prefix made from its name (dots turned into underscores) and the running number.

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
