# Set one policy to Enabled, Disabled or Not configured, with its options and comment, for the computer or the user.

## Outcome

The system loads the current state and every stored option, the person states what they want, and a forecast of exactly what will be written and removed is confirmed before saving.

## Scope

This epic covers: EditSetting.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| List editor | new | none: new in this codebase | The grid in which the person adds, names and removes the entries of a list option; not the policy dialog itself. |
| Not configured | new | none: new in this codebase | The policy has no settings in the chosen side; not the same as Disabled, which is a setting of its own. |
| Policy state | new | none: new in this codebase | Whether a policy is Enabled, Disabled or Not configured in the chosen side; not the values of its options. |
| Side | new | none: new in this codebase | Computer or User: the part of the system a policy setting applies to; not a category of policies. |
| Apply | new | none: new in this codebase | Saves the chosen state now and keeps the policy open; not OK, which also closes it. |
| Save Policies | new | none: new in this codebase | The command that writes all accepted changes to disk; not part of this dialog. |
