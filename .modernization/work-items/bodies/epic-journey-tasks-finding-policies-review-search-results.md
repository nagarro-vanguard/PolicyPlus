# Work through the hits of a search and pick the policy to open.

## Outcome

Hits appear for the person to work with while the search is still running, so they can open one early, stop when they have enough, and come back to the same results later.

## Scope

This epic covers: Main; FindResults.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Results as they arrive: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Search hit | new | none: new in this codebase | A policy that matches the search, shown in the results with its category; not every policy that was checked. |
