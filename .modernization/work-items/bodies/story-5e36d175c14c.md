# Show policy settings as semantic policy text with or without a heading

## Problem

- People can copy just the fragment they need or a complete, labelled text to share.

## Goal

- A policy's settings are written as semantic policy text, with the heading 'Policy Plus Semantic Policy' only when the person ticks the option.

## Acceptance criteria

- Given a policy's settings shown as text, when "Include SPOL header" is ticked, then the text starts with the heading "Policy Plus Semantic Policy" and a blank line; when it is not ticked, only the fragment is shown.

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
