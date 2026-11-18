# See what a policy is, which section it applies to, where it sits and what it is supported on.

## Outcome

The whole context of a policy is shown together, with gaps (orphaned category, missing support) flagged up front.

## Scope

This epic covers: DetailAdmx.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Everything at a glance: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Orphaned policy | new | none: new in this codebase | A policy whose named category does not exist in the loaded definitions; it is not the same as an uncategorized policy, which names no category at all. |
| Missing support | new | none: new in this codebase | A policy that names a support definition which is not in the loaded definitions; it is not the same as a policy with no support named. |
