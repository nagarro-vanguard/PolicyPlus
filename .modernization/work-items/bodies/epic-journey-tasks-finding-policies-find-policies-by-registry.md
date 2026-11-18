# Find the policies that control a given system setting, named by its key or value.

## Outcome

The person pastes or types whatever they have in one line, such as a full setting path ending in a value name, and the system works out which part is the key and which the value, checking as they go.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- One line, split for me: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Registry line | new | none: new in this codebase | The single line of text a person gives about a setting, such as a full path ending in a value name; it is not yet divided into key and value. |
| Registry key | new | none: new in this codebase | The path part of a setting that a policy reads or writes; it is not the name of the value held under it. |
| Registry value name | new | none: new in this codebase | The name of one setting held under a key; it is not the key path. |
