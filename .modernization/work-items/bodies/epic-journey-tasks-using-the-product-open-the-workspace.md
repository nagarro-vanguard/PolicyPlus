# Get back to the policy work where it was left: the last policy sources and policy definitions are ready to browse.

## Outcome

Everything the person last worked with is brought back in the order they care about, and anything wrong is reported once, in one place.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy source | new | none: new in this codebase | Where policies are read from and saved to, such as the local Group Policy, a policy file, the registry or a scratch space; it is not the definitions that describe the policies. |
| Policy definitions | new | none: new in this codebase | The templates that describe the available policies; not the sources where policy settings are stored. |
