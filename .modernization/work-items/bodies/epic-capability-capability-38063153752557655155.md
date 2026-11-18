# Carry over editing policy files directly

## Outcome

Change the raw keys and values of a policy file, and bring registry files in or out of it.

## Scope

This epic covers: OpenSection; EditPol; EditPolDelete; EditPolKey; EditPolMultiStringData; EditPolNumericData; EditPolStringData; EditPolValue; ExportReg; ImportReg; Main; WideRangeNumericUpDown.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Review a policy file in the raw editor: a new journey in this codebase.
- Add a key: a new journey in this codebase.
- Import a POL file: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Area | new | none: new in this codebase | One of the two halves of policy settings, User policies or Computer policies; not a single policy and not a file. |
| Policy file | new | none: new in this codebase | The file of raw registry-style keys and values that holds policy settings for one area; not the policy definitions that describe them. |
| Deletion entry | new | none: new in this codebase | A special entry in a policy file that tells the machine to remove a value or all values when policies are applied; not an ordinary value. |
| Key | new | none: new in this codebase | A named folder in a policy file that holds values and sub-keys; not a value. |
| Value | new | none: new in this codebase | A named piece of data of one kind stored under a key in a policy file; not a key and not a policy. |
| Cleared key | new | none: new in this codebase | A key marked so that applying policies removes the values the machine holds in it; not a key forgotten from the file. |
| Forget | new | none: new in this codebase | To remove an entry from the policy file leaving no deletion mark; not the same as deleting, which leaves a mark. |
| Registry prefix | new | none: new in this codebase | The text put in front of key names in a registry file, such as the current-user or local-machine prefix; not part of the key's name in the policy file. |
| Source branch | new | none: new in this codebase | The key whose contents are exported, with everything below it; empty means the whole policy file. |
| Registry file | new | none: new in this codebase | A text file of registry keys and values that Windows can import; not a policy file. |
| Default value | new | none: new in this codebase | The value of a registry key that has no name, written as an at sign in a registry file; not a value called default. |
| POL file | new | none: new in this codebase | A Windows policy file that stores raw registry-style policy settings for one area; not a registry export file. |
| Hexadecimal mode | new | none: new in this codebase | The setting of the number field that shows and reads the value as base-16 text; it is not a different value, only a different way of writing the same number. |
| Largest allowed value | new | none: new in this codebase | The biggest number the edited value can hold, which depends on whether the value is a 32-bit or a 64-bit number; it is not a limit on how many digits can be typed. |
