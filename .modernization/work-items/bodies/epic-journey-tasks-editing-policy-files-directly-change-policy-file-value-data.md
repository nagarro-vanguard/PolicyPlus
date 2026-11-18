# Change the data of an existing value in a policy file.

## Outcome

The system accepts a number in decimal or hexadecimal as typed and shows both forms, so there is no mode to switch.

## Scope

This epic covers: EditPol.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Either form accepted: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Value data | new | none: new in this codebase | The content stored in a named value of a policy file, such as a number, a text or a list of texts; it is not the value's name or its kind. |
