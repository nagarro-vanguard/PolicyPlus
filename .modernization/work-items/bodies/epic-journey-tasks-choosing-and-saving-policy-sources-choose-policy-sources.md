# Decide where the user and computer policies are kept and start working against those sources.

## Outcome

The person states the home of the user policies and of the computer policies, giving details only for the kinds that need them, and the system opens both.

## Scope

This epic covers: OpenPol; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Say where each side lives: a new journey in this codebase.
- Say where each side lives: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy source | new | none: new in this codebase | The place where one side's policies are kept and read from, such as local files or a policy file; it is not the template that describes what the policies mean. |
| Scratch space | new | none: new in this codebase | An empty source that keeps nothing beyond the session; it is not a saved policy file. |
