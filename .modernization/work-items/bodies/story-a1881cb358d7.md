# Read a policy's saved state from its stored values

## Problem

- A policy shows the same Enabled options as the legacy product.

## Goal

- Read each kind of policy element and checkbox from the values stored in a source.

## Acceptance criteria

- Given a number or text element, when read, then the saved value is taken as stored without checking it exists or its kind.
- Given a multi-line text element, when read, then its value is taken as stored without checking existence.
- Given a checkbox, when read, then it is on when its on value or all its on list is present, or value 1 when none is defined, and off otherwise including when the off value is present.
- Given a list of values, when checked, then it counts as present only when every value is present.
- Given a choice element, when read, then it is the position of the first item whose value is present and whose list is wholly present, or -1.
- Given a list element with names the person provides, when read, then it is every stored name with its value under the element's key.
- Given a list element whose names do not matter, when read, then with a prefix it is prefix1, prefix2 and so on until the first missing number, otherwise every stored value name under the key.

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
