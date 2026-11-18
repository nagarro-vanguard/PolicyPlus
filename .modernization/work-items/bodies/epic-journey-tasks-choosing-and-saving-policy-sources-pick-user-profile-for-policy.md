# Choose a user profile whose stored settings are to be the user policy source.

## Outcome

The system proposes the signed-in person's own profile and the person only confirms, or picks another.

## Scope

This epic covers: OpenUserRegistry.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Start from my own profile: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| User profile | new | none: new in this codebase | A person's own stored settings on the computer, which can serve as the user policy source; not the machine-wide policy settings. |
| Profile settings file | new | none: new in this codebase | The file holding a user profile's stored settings, whose location is returned once a profile is chosen; not the policy source itself. |
