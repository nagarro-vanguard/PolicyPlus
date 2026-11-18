# Remove keys or values from a policy file, either leaving a deletion instruction for the machine or forgetting them entirely.

## Outcome

What is selected tells the system what to do: a value is marked for deletion straight away with its name known, and a key offers its choices.

## Scope

This epic covers: EditPol.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Straight from the selection: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Deletion entry | new | none: new in this codebase | A value named "**del." followed by the value name, which removes that value on the machine when policies are applied; it is not the same as forgetting the value, which leaves nothing in the file. |
| Forget | new | none: new in this codebase | Remove an entry from the file with no deletion instruction left behind; it is not the same as marking a value for deletion. |
