# Bring the contents of an exported set of machine settings into a policy source.

## Outcome

The person gives the exported settings and where they go; the system validates, works out the key prefix and reports what it found before applying.

## Scope

This epic covers: ImportReg.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Prefix worked out for you: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Exported settings file | new | none: new in this codebase | A text file exported from the machine's settings editor that lists keys and their values; it is not a policy file. |
| Key prefix | new | none: new in this codebase | The leading part of every key name in an exported settings file that is left off when the settings are saved in the policy source; it always ends in a backslash and is not the policy source's own path. |
| Default value | new | none: new in this codebase | A value that belongs to a key but has no name; it is not an ordinary named setting. |
| Top-level section | new | none: new in this codebase | The first part of a key name, such as HKEY_USERS or HKEY_CURRENT_USER, that groups the keys of the machine's settings store; it is not a single key. |
