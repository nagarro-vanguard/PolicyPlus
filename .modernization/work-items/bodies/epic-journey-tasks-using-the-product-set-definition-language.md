# Choose the language in which policy definition text is shown and have it applied.

## Outcome

The person states the language, the system checks it is well formed and changed, saves it, and offers to apply it now.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Name the language, then reload: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Definition language | new | none: new in this codebase | The language code, two parts around a hyphen such as en-US, that picks the folder the policy definition text is read from; it is not the language of the program's own screens. |
