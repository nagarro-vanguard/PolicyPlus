# Write a policy source, or one branch of it, as an exported set of machine settings.

## Outcome

The person only names the file; the system proposes the branch and prefix from what is being edited and exports.

## Scope

This epic covers: EditPol.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Export what is selected: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Registry settings file | new | none: new in this codebase | A text file of registry keys and values that can be imported on a machine; it is not the binary policy file the person edits. |
| Export branch | new | none: new in this codebase | The part of the policy source that is exported, starting from a key; it is not the whole file unless left empty. |
| Registry prefix | new | none: new in this codebase | The root name written in front of each exported key, such as the current-user or local-machine root; it is not the branch. |
