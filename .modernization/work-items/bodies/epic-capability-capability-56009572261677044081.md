# Carry over using the product

## Outcome

Product's own settings, such as the language of the policy text.

## Scope

This epic covers: LanguageOptions; Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Open Policy Plus: a new journey in this codebase.
- Check the version: a new journey in this codebase.
- Switch policy text language: a new journey in this codebase.
- Leave Policy Plus: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Policy text language | new | none: new in this codebase | The language code (for example en-US) that decides which language of template text is shown for policies; it is not the language of the product's own screens. |
| Workspace | new | none: new in this codebase | The loaded policy definitions together with the open policy sources the person is working on; it is not a saved policy file. |
| Policy source | new | none: new in this codebase | A place where the user or the computer policies are kept and read from; it is not the definitions that describe the policies. |
| Definitions package | new | none: new in this codebase | The set of policy template files (ADMX and ADML) the workspace is loaded from, stored by the product; it is not a policy source. |
| Default definitions package | new | none: new in this codebase | The definitions package loaded when none was saved or the saved one fails; it is the replacement for the definitions folder that Windows provides in the legacy product, not the person's own package. |
| Starting source | new | none: new in this codebase | The policy source both sides open as when nothing usable was saved; in the legacy product it is the local Group Policy files, which the new product does not read from the person's computer. |
