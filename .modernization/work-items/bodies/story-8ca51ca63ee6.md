# Work out whether a policy is enabled or disabled from its values

## Problem

- A policy's state is not stored; it is read from values, so every screen must reach the same verdict from the same values.

## Goal

- Build the shared rules that weigh the registry values of a policy as evidence that it is enabled or disabled.

## Acceptance criteria

- Given a policy with a registry value of its own, when it is assessed, then it is enabled evidence when the value holds its on value (the number 1 when the template gives none), and disabled evidence when it holds its off value or, when the template gives none, is marked for deletion.
- Given the policy's lists of on-values and off-values, when they are assessed, then each present value counts as enabled or disabled evidence, using the list's own key when it names one.
- Given a policy's list element, when it is assessed, then a list marked for deletion counts as one deleted element and a list holding any values counts as a present element and cancels that deletion.
- Given a number, text, choice or multi-line text element, when it is assessed, then a value marked for deletion counts as a deleted element and a present value counts as a present element.
- Given the elements of a policy, when evidence is added, then if any element is present their count is added to the enabled evidence, and only when none is present do deleted elements add to the disabled evidence.

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

- Evidence: A registry value found present or marked for deletion that counts toward a policy being enabled or disabled; not the final state itself.

## Out of scope

- Anything a later story builds on top of this.
