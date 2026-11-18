# Open a policy file for direct editing of its raw keys and values, with a warning the first time, and leave the editor when done.

## Outcome

The system chooses the area when only one is backed by a policy file, shows the warning only to those who have not accepted it, and tells the person what has changed before they leave.

## Scope

This epic covers: OpenSection.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- The system picks the area: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Raw policy editing | new | none: new in this codebase | Working directly on the keys and values stored in a policy file; not choosing settings through the policy browser. |
| Deletion entry | new | none: new in this codebase | A special entry in a policy file that marks a value or all values of a key for removal; not an ordinary value. |
