# Add a single policy template file to the policies already loaded.

## Outcome

The person chooses one or more template files and the system adds each in turn and reports each failure.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Add several at once: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Template file | new | none: new in this codebase | A single administrative template file (ADMX) holding policy definitions; it is not a folder of templates or a language file. |
