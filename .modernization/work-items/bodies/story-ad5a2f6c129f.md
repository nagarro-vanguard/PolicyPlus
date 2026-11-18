# Read policies, products and options from template files

## Problem

- The policy catalogue is only as correct as its reading of Microsoft's templates, so each reading rule is built once and tested.

## Goal

- Build the shared rules that turn a template file into categories, products, registry values, policies and typed options, including the defaults for missing attributes.

## Acceptance criteria

- Given a category carries any content, even only a comment, when the template is read, then it must contain a parent entry with a reference, otherwise the template is refused as invalid; a category holding only a comment still needs that parent entry; its explanation is optional.
- Given products in a template, when they are read, then three levels are kept (product, major versions, minor versions), deeper levels are not read, and a version without a version index makes the file invalid.
- Given a registry value in a template, when it is read, then it is a delete marker, a number or a text by the first of those it contains, and a value with none is a delete marker.
- Given a policy, when it is read, then its switched-on and switched-off effects come from its enabled and disabled values and lists, each list entry naming a value and optionally its own key, else the list's default key.
- Given a policy, when it is read, then its category and support rule come from the references in its own content and it has options only if it contains an options section.
- Given a policy option of a kind other than number, yes/no, text, list, choice or multi-line text, when it is read, then it is dropped without notice.
- Given a number option, when it is read, then it accepts 0 to 4,294,967,295 unless limits are set, overwrites existing values unless soft, is stored as a number unless text, and unreadable attributes fall back to these defaults.
- Given a text option, when it is read, then it allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise, with unreadable attributes falling back to these defaults.
- Given a yes/no option, when it is read, then its registry effect for true and false comes from true and false values and lists.
- Given a choice option, when it is read, then it is optional unless required, each choice keeps a single registry value, a list of values or both, and a choice with neither is accepted and changes nothing.
- Given an option, when its registry value name is chosen, then it is its own value name, except for a list option with a value prefix attribute (even if empty), which uses the prefix and falls back to its own name only when the prefix is empty.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Terminologies

- Policy option: An input a policy offers when enabled, such as a number, text, yes/no, list or choice; not the policy's enabled or disabled state.
- Product: A product, its major versions and their minor versions that policies are supported on; not a policy.

## Out of scope

- Anything a later story builds on top of this.
