# Carry over browsing policy definitions

## Outcome

Look through the loaded policy templates: categories, products, support rules, template files and policies, and open the details of each.

## Scope

This epic covers: Main; LoadedAdmx; LoadedProducts; LoadedSupportDefinitions; DetailAdmx; DetailCategory; DetailPolicy; DetailProduct; DetailSupport; InspectPolicyElements; OpenAdmxFolder.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Load policy definitions: a new journey in this codebase.
- Browse policies: a new journey in this codebase.
- Add policy definitions: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Workspace | new | none: new in this codebase | The set of policy definitions currently loaded; it is not the saved policy settings. |
| Definitions folder | new | none: new in this codebase | The folder of template files remembered for the next start; it is not a single added file. |
| Current category | new | none: new in this codebase | The category whose contents fill the list; it is not the highlighted row. |
| Selected policy | new | none: new in this codebase | The policy last highlighted in the list; it is not the policy being edited. |
| Area | new | none: new in this codebase | The section a policy applies to, user or computer; it is not a category. |
| Deduplication | new | none: new in this codebase | Merging identical user and computer policy pairs into one; it is not deleting policies. |
| Template file | new | none: new in this codebase | An ADMX file of policy definitions; not the language file with its texts. |
| Major version | new | none: new in this codebase | A first-level revision of a product; not a minor version. |
| Minor version | new | none: new in this codebase | A revision beneath a major version. |
| Support rule | new | none: new in this codebase | A named condition listing the products a policy runs on; not a policy. |
| Orphaned | new | none: new in this codebase | Naming a parent or category that is not loaded; not the same as having none. |
| Inspector | new | none: new in this codebase | The window listing a policy's definition as written in the template; not the editor of its settings. |
| Semantic policy text | new | none: new in this codebase | A text script describing a policy's state and options; not a registry file. |
| Policy definitions | new | none: new in this codebase | The administrative template files (ADMX and ADML) that describe the available policies; they are not the policy settings a person has chosen. |
| Clear before adding | new | none: new in this codebase | The option to remove the definitions already loaded before the new ones are added; it is not a deletion of any policy setting. |
