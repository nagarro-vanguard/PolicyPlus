# Build the shared components

## Outcome

The components several journeys rest on are built once, so every journey can rely on them.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase
- Set up tooling and environment
- Set up testing
- Set up knowledge in code
- Set up platform

## Data modelling

No finding: decided at build.

## Scale

No finding: decided at build.

## Security

No finding: decided at build.

## Isolation

No finding: decided at build.

## Performance

No finding: decided at build.

## Durability

No finding: decided at build.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Definitions | new | none: new in this codebase | The administrative template and language files that describe the policies; not the settings people choose. |
| Empty category | new | none: new in this codebase | A category with no visible policy and no visible subcategory; not a category that is missing. |
| Policy file | new | none: new in this codebase | A saved file of policy settings for one machine or user; not the definitions that describe the policies. |
| Marked for deletion | new | none: new in this codebase | A value the file says should be removed on the machine; not a value that is merely absent. |
| Live settings | new | none: new in this codebase | The policy settings currently in force on the machine; not a saved policy file. |
| User hive | new | none: new in this codebase | A user's stored settings file; not the live settings of the signed-in user. |
| Registry export file | new | none: new in this codebase | A registry text file made to import settings elsewhere; not a policy file. |
| Marker-style entry | new | none: new in this codebase | A policy file entry whose name starts with '**' and tells the program to delete or clear something instead of storing a value; it is not a stored setting. |
| Scratch space | new | none: new in this codebase | A source that starts empty, can be changed and is never saved; it is not a file or the registry. |
| SID | new | none: new in this codebase | The security identifier that names one account for Windows; it is not the account's typed user name. |
| Evidence | new | none: new in this codebase | The settings found in a source that point to a policy being on or off; it is not the policy's final state, which is settled from all of it. |
| Preference store | new | none: new in this codebase | The place where the program keeps the person's remembered choices between runs; it is not the policy files being edited. |
| Remembered choice | new | none: new in this codebase | A decision the person made that the program keeps between runs, such as language or definitions folder; it is not a policy setting. |
| Template | new | none: new in this codebase | A definition file describing policies, categories and products; not the language text that names them. |
| Language text | new | none: new in this codebase | The file holding the names, descriptions and screen layouts of a template in one language; not the template itself. |
| Namespace | new | none: new in this codebase | The unique name a template declares for itself so its items stay apart from other templates' items; not a short label, which is only a label inside one template. |
| Preference | new | none: new in this codebase | A setting whose registry key lies outside the three policy locations; not a managed policy. |
| Support rule | new | none: new in this codebase | The statement of which products a policy works with; not the products themselves. |
| Fully writable | new | none: new in this codebase | A source whose changes can be saved; not one that can only be viewed or that exists only in memory. |
| Loaded definitions | new | none: new in this codebase | The policy definitions currently open in the workspace for browsing; not the definition files kept in the folders they were read from. |
| Workspace | new | none: new in this codebase | Everything the person has open in the program: the loaded definitions and the previous search results; not the folders the definitions were read from. |
| Previous search results | new | none: new in this codebase | The results of searches run earlier in the workspace; not the policies that are loaded. |
| Semantic text | new | none: new in this codebase | The written form of a policy's settings, one section per area, that can be moved in and out of the program; it is not the registry file form. |
