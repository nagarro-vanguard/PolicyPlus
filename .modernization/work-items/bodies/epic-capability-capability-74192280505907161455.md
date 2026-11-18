# Carry over choosing and saving policy sources

## Outcome

Pick where the user and computer policies are kept (POL file, registry, a user's registry hive, a user's Group Policy object, or the live system) and save changes back to them.

## Scope

This epic covers: OpenUserGpo; OpenUserRegistry; OpenPol; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Choose where policies are kept: a new journey in this codebase.
- Open policy sources: a new journey in this codebase.
- Save policies: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Security identifier (SID) | new | none: new in this codebase | The identifier that names one account and its Group Policy object, such as S-1-5-21-...; it is not the account's display name. |
| Per-user Group Policy object | new | none: new in this codebase | The policy kept for one named user account, used as the user policy source; it is not the local Group Policy that applies to everyone on the computer. |
| User hive | new | none: new in this codebase | The file ntuser.dat in a profile folder, holding that person's registry settings; it is not the live registry of the signed-in person. |
| Policy source | new | none: new in this codebase | The place where one side's policies are kept and saved back to: Local GPO, Registry, POL file, per-user GPO, user hive or Scratch space; it is not the template files that describe the policies. |
| Scratch space | new | none: new in this codebase | An empty source that can be changed but is never saved anywhere; it is not a file the person can download. |
| gpt.ini | new | none: new in this codebase | The small file next to a Group Policy source's policy file that holds its version number and extension lines; it is not the policy file itself. |
