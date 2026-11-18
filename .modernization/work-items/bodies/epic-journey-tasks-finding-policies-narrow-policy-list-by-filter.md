# Limit the policy list to policies of a chosen type, state, comment status and supported products, and switch that limit on or off.

## Outcome

Choices narrow the policy list the moment they are made, with no confirm step, and a person can revert or switch the limit off at any time.

## Scope

This epic covers: FilterOptions; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Live filter: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Limit | new | none: new in this codebase | The set of conditions (type, state, comment status, supported products) that narrows the policy list; it is not the choice of user or computer area. |
| Only Filtered Policies | new | none: new in this codebase | The switch that applies or lifts the limit on the policy list; it is not the limit's contents. |
| Supported on | new | none: new in this codebase | The wish to limit the list to policies supported by chosen products; it is not the policy's own list of supported products. |
