# Add a new key, or a new value of a chosen kind, to a policy file.

## Outcome

The system checks a key name while it is typed, and a value is added in one pass with its kind worked out from the data.

## Scope

This epic covers: EditPol.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Checked as you type: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Key | new | none: new in this codebase | A named folder in a policy file that holds values and other keys; not a value itself. |
| Value kind | new | none: new in this codebase | The kind of data a value holds: string, expandable string, list of strings, 32-bit number or 64-bit number; not the value's name. |
