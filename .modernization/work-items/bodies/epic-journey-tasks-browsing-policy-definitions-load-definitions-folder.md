# Load a folder of policy definitions into the workspace so its policies can be browsed.

## Outcome

The person gives one folder; the system decides replace or add from what is already loaded.

## Scope

This epic covers: OpenAdmxFolder.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Load without questions: a new journey in this codebase.
- Load without questions: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Definitions folder | new | none: new in this codebase | A folder holding policy definition files and their language texts that the workspace can load; not a policy file or a saved policy source. |
| Domain folder | new | none: new in this codebase | The shared policy definitions folder of the domain the computer has joined; not the standard Windows folder on the computer itself. |
| Replace | new | none: new in this codebase | Emptying the loaded definitions before loading a folder; not adding the folder to what is already loaded. |
| Remembered folder | new | none: new in this codebase | The definitions folder the workspace loads at the next start; not any folder added on top of the loaded set. |
