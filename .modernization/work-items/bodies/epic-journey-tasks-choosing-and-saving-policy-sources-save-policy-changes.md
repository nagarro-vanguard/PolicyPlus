# Save the policy settings and comments to their sources, make them take effect where possible, and remember the chosen sources for next time.

## Outcome

The person asks once to save and the system does everything, then reports each source's outcome.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Save in one go: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Group Policy version file | new | none: new in this codebase | The small file beside a policy file that carries a version number the machine reads to notice a change; it is not the policy file itself. |
| Policy source | new | none: new in this codebase | A place where the user or computer policies are kept, such as a POL file, the registry, a user's registry hive, a user's Group Policy object or the live system; it is not a policy definition. |
| Scratch space | new | none: new in this codebase | A policy source choice whose changes are not kept anywhere; saving it reports that the changes are discarded. |
