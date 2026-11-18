# Obtain Microsoft's current set of policy definitions and install them in a folder the program can use.

## Outcome

The person asks for the definitions and the system picks the usual folder, installs everything and reports; choosing another folder is an option, not a required step.

## Scope

This epic covers: DownloadAdmx.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Install in one go: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy definitions folder | new | none: new in this codebase | The folder where the program reads Microsoft's policy templates and language files from; not the folder holding saved policy settings. |
| Regional format language | new | none: new in this codebase | The language of the person's regional settings, which can differ from the display language; the program installs its language files, with English as the fallback. |
| Scratch folder | new | none: new in this codebase | The temporary folder holding the downloaded package while it is installed; not a place the person keeps files. |
