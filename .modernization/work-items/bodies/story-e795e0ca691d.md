# Edit the data of a policy value by its kind

## Problem

- Raw editing of a policy file is only safe when each value is edited in a form that matches what it holds, and when kinds the editor cannot handle are refused instead of damaged.

## Goal

- Let a person change the data of a value in a policy file with the entry that fits its kind: a text box for text, a number box for numbers, a multi-line box for lists of text.

## Acceptance criteria

- Given a value of a plain or expandable text kind, when the person edits it, then a text box showing its current data is offered.
- Given a value of a 32-bit or 64-bit number kind, when the person edits it, then a number box showing its current data is offered.
- Given a value that is a list of text, when the person edits it, then a multi-line box showing its current data is offered.
- Given a value of any other kind, such as binary, when the person tries to edit it, then they see "This value kind is not supported." and nothing changes.
- Given an edit dialog is open, when the person cancels it, then the value keeps its data exactly as it was.
- Given the person confirms new data, when the edit is applied, then the value holds the new data, keeps its name and kind, and stays selected.

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
