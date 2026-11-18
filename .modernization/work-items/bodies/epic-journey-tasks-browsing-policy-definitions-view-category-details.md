# See a category, its parent and how it relates to policies.

## Outcome

Show the category with its full chain of parents and the policies it relates to, so no step-by-step climbing is needed.

## Scope

This epic covers: DetailAdmx.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Whole ancestry at once: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Orphaned category | new | none: new in this codebase | A category whose named parent cannot be found among the loaded definitions; it is not a top-level category, which names no parent at all. |
