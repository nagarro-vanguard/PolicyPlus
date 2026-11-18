# Make the newly downloaded policy definitions the ones the program works with.

## Outcome

The new definitions are fully checked beside the current ones, and only when they are ready do they replace the current ones in one step.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Only Filtered Policies | new | none: new in this codebase | The switch that limits the list to policies passing the active filter; not the choice of area. |
