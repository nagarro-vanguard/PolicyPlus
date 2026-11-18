# Build the shared rules

## Outcome

The rules several capabilities rest on are built once, so every capability can rely on them.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase
- Set up tooling and environment
- Set up libraries
- Set up testing
- Set up knowledge in code

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
| Orphaned category | new | none: new in this codebase | A category whose definition names a parent that is not among the loaded definitions; not a category that simply has no parent. |
| Empty category | new | none: new in this codebase | A category holding no subcategories and no policies at all, hidden ones included; not one whose policies are merely hidden by a filter. |
| Policy state | new | none: new in this codebase | Enabled, Disabled, Not Configured or Unknown for one area; not the policy's options. |
| Template file | new | none: new in this codebase | An administrative template (ADMX) that defines categories, products, support rules and policies; not the language file (ADML) that supplies their text. |
| Reference | new | none: new in this codebase | A name in one template that points to a category, product or support rule, possibly in another template; not the policy's own text. |
| Settings screen layout | new | none: new in this codebase | The arrangement of controls a policy shows for its options; not the options' registry effects. |
| Policy option | new | none: new in this codebase | An input a policy offers when enabled, such as a number, text, yes/no, list or choice; not the policy's enabled or disabled state. |
| Product | new | none: new in this codebase | A product, its major versions and their minor versions that policies are supported on; not a policy. |
| Control | new | none: new in this codebase | One input or label on a policy's settings screen; not the registry value it writes. |
| Evidence | new | none: new in this codebase | A registry value found present or marked for deletion that counts toward a policy being enabled or disabled; not the final state itself. |
| Support rule | new | none: new in this codebase | A named group of product entries that says where a policy is supported, with all-of or any-of logic; not a single product. |
| Marked for deletion | new | none: new in this codebase | A value a policy file records as to be removed when applied; not a value that is simply absent. |
| Policy key | new | none: new in this codebase | A registry key within one of the three policy branches; not any registry key. |
| Template file | new | none: new in this codebase | An ADMX file that defines policies, categories, products and support rules; not the language file that carries their text. |
| Language file | new | none: new in this codebase | The ADML file that holds the text of one template in one language; not the template itself. |
| Template package | new | none: new in this codebase | The set of template files and language subfolders a person uploads (or the service downloads from Microsoft) to load definitions; not a single template file. |
| POL file | new | none: new in this codebase | A Registry.pol policy file that holds registry keys and values for computers or users; not a REG file, which is text. |
| Policy source | new | none: new in this codebase | The place user or computer policy values are read from and saved to; in this product always an imported file or an empty working copy, not the live system. |
| Registry source | new | none: new in this codebase | A source filled from an imported REG file in place of the Windows registry; not a live view of the machine's registry. |
| Local GPO | new | none: new in this codebase | The computer's own Group Policy, brought in as its Registry.pol file by upload; not a domain policy. |
| User GPO | new | none: new in this codebase | A person's Group Policy object (a policy set held in the domain for that person), brought in as its Registry.pol file by upload (integrations.decision-7). |
| User hive | new | none: new in this codebase | A person's saved registry settings file, brought in as a REG file; not a registry loaded into the machine. |
| SID | new | none: new in this codebase | The security identifier that names a person's account; a User hive source may show it in brackets. |
| Scratch space | new | none: new in this codebase | An empty working copy of policies that can be changed but is never saved anywhere; not any file. |
| Comment file | new | none: new in this codebase | A CMTX file holding the comments written on policies; here an import and export format, not where comments are kept. |
