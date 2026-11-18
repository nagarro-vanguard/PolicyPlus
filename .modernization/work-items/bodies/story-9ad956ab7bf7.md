# Read support rules, products, classes and list options from templates

## Problem

- Support filtering and editing depend on these definitions being read the way the legacy product reads them.

## Goal

- Domain rules that turn template content into support rules, a product tree, the computer or user area of each policy and list options.

## Acceptance criteria

- Given a support rule, when it is read, then it is 'any of' for a first logic element "or", 'all of' for "and", blank otherwise, only that first element is read, and a range may carry a minimum and maximum version.
- Given child products attached to parents, when products are built, then each child sits under its parent defined in the same template and only parentless products are top-level.
- Given a policy class of "Machine", "User" or any other value, when it is read, then it applies to computers, users, or both respectively.
- Given a policy declared for an area or for both, when areas are checked, then it applies to the declared area and a policy declared for both applies to each.
- Given a list option, when it is read, then it replaces other entries of its key unless additive, stores plain text unless expandable, numbers entries automatically unless the template says the person names them, and is prefixed only when a value prefix is given.

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
