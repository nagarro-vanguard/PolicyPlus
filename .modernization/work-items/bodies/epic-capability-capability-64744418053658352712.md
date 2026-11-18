# Carry over changing policy settings

## Outcome

Set a policy to Enabled, Disabled or Not configured with its options and comment, and move settings in or out as SPOL text.

## Scope

This epic covers: EditSetting; ListEditor; ImportSpol; InspectSpolFragment; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Change a policy's setting: a new journey in this codebase.
- Import settings from SPOL: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy setting | new | none: new in this codebase | The state of one policy (Enabled, Disabled or Not configured) with its option values and comment; not the policy's definition. |
| Section | new | none: new in this codebase | Whether a policy setting is for the Computer or for the User; not a category of policies. |
| List editor | new | none: new in this codebase | The grid in which a list option's entries are typed; not the policy dialog itself. |
| Option | new | none: new in this codebase | One configurable value of a policy such as a number, text or choice; not the policy's state. |
| Apply | new | none: new in this codebase | Saving the policy and staying in the dialog; not closing it. |
| SPOL | new | none: new in this codebase | Semantic policy text that lists policies with their state and options; not a registry file. |
