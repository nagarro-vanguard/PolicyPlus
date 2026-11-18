# Bring in policy settings text and check...: Semantic Text Import Session

## Problem

- Administrators find out whether a text is good before they offer it to their computer or user policies, without asking for a separate check, and an earlier text or result never lingers.
- Open point: Should the live check also run again after every edit of the typed text, or only when text arrives from a file or is first entered?
- Open point: Should a text with line feeds alone, which today fails with the signature message, be accepted or get a message that names the cause?
- Open point: Should an empty bracketed setting be accepted for a list setting without any message, since today it silently removes the existing entries?
- Open point: Should this refusal still appear when the apply is offered only after the text read correctly, or is the check on the window's own button redundant?

## Goal

- A person brings in a semantic policy text, from a file or typed in, and sees at once how many policy settings it holds or the line and reason of the first fault. Nothing is applied in this story.

## Acceptance criteria

- Given the import window is opened, when it opens, then any earlier read result is dropped, so a closed window hands nothing back.
- Given the person picks a file, when it is chosen, then the whole file fills the text box, replacing what was there without asking; after a Yes to "Are you sure you want to reset the text box?", the text returns to the header "Policy Plus Semantic Policy" and blank lines.
- Given the text did not read correctly, when the person asks to go on to apply it, then the import window refuses with "The SPOL text is invalid: " and the reason, and hands nothing on; only text that read correctly is passed on.

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
