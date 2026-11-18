# Load a policy file into the user or computer policy source.

## Outcome

The person names the policy file and the source it belongs to; the system loads it and says whether it worked.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy file import | new | none: new in this codebase | Loading a chosen policy file into the user or computer source, held in memory; it is not saving to disk. |
| Held change | new | none: new in this codebase | A change kept in memory that reaches disk only when the person saves; it is not a stored change. |
