# Merge identical user and computer policies into single policies that apply to both.

## Outcome

Show the identical pairs first, let the person confirm, then merge and report the count.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Review then merge: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Identical pair | new | none: new in this codebase | A user policy and a computer policy that are alone in the same category under the same name, with the same explanation text and the same stored-setting location; not merely similar policies. |
| Both-sections policy | new | none: new in this codebase | A single policy that applies to both users and computers; not a policy of only one section. |
