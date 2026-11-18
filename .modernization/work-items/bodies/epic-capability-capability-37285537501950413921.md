# Carry over getting Microsoft policy definitions

## Outcome

Download Microsoft's current policy template package and unpack it into a folder the program can read.

## Scope

This epic covers: DownloadAdmx; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Get Microsoft's policy definitions: a new journey in this codebase.
- First run with incomplete definitions: a new journey in this codebase.
- Get definitions from the Help menu: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy definitions | new | none: new in this codebase | The template files, with their language files, that describe every policy the program can show; not the policy settings a person has chosen. |
| Template package | new | none: new in this codebase | The single Microsoft download that holds the template files and their language files; not the definitions already stored in the program. |
| Format language | new | none: new in this codebase | The language of the person's regional settings, which can differ from the language the program is shown in. |
| Welcome offer | new | none: new in this codebase | The one-time question on first run whether to download Microsoft's definitions; not the Help menu item that does the same at any time. |
| Orphaned category | new | none: new in this codebase | A category whose definition names a parent that is not among the loaded definitions; not a category that is merely empty. |
