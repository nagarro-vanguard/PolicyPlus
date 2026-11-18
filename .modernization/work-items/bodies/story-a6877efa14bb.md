# Validate template and language files while reading them

## Problem

- A malformed file must be refused with a reason instead of loading half of its content.

## Goal

- Domain parsing rules that read a template and its language file into typed definitions and refuse the file as invalid when required parts are missing or malformed.

## Acceptance criteria

- Given a template file, when it is read, then it is refused as invalid if any of these is missing or unreadable: the policy definitions section; a namespace entry's prefix or namespace; a superseded-ADM file name; a minimum revision (missing or not a number); a support rule's name or display name; a support reference or range without its reference, or a version bound that is not a whole number; a product's name, display name or version index; a category's name or display name; a category's parent entry, or the parent's reference when the category has content; a policy's name, display name, key or class; a policy's category or supported-on reference; a number value's value; a list item's value name; a choice item's display name; or an option's id.
- Given a superseded entry without a file name or a minimum revision that is absent or not a number, when the template is read, then it is refused as invalid; when present they are read.
- Given a template that lists a target namespace and declares prefixes, when it is read, then the namespace is the one listed as its target, and a prefix declared twice refuses the file as invalid.
- Given a language file with no policy resources section or a revision that is missing or not a number, when it is read, then it is refused as invalid and its template is not loaded.
- Given a language file with several presentation tables, when it is read, then screen layouts come only from the first table, and a layout id that appears twice refuses the file as invalid.
- Given a control in a language file, when it is read, then it keeps the reference id the file gives it, tying it to the matching option in the template, or has no id when none is given.
- Given an XML attribute that is absent or whose text is invalid for the type of its default, when it is read, then the default is used.
- Given items from two templates with equal names, when each is named, then its unique name is its namespace, a colon and its name, so they stay apart.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Out of scope

- Anything a later story builds on top of this.
