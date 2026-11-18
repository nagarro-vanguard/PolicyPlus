# Settle each policy's state from the evidence in its source

## Problem

- People see whether each policy is Enabled, Disabled or Not configured in the way Windows would read it.
- Open point: The rules give the states Not Configured, Not configured, Unclear and Unknown in different places; which exact wording and when 'Unclear' is shown on screen is not settled.

## Goal

- Enabled and disabled evidence is counted from the values and lists a source holds for a policy and its options, and each policy's state in an area is settled and given to the screens as plain facts.

## Acceptance criteria

- Given a policy with a registry value of its own, when it is read, then it counts as enabled evidence when the value holds its 'on' value (the number 1 when the template gives none) and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none.
- Given a policy's switched-on and switched-off effects, when they are read, then they come from its enabled and disabled values and lists, where a list entry names a value and optionally its own key, falling back to the list's default key.
- Given a policy's lists of on-values and off-values, when they are read, then each value present counts as enabled or disabled evidence, using the list's own key when it names one.
- Given a policy's list elements, when they are read, then a list marked for deletion counts as one deleted element, and a list holding any values counts as a present element and cancels that deletion.
- Given a number, text, choice or multi-line text element, when it is read, then a value marked for deletion counts as a deleted element and a value that is present counts as a present element.
- Given a checkbox element, when it is read, then a value marked for deletion counts as one deleted element; otherwise each present off value (or off-list value) counts a tenth of a deleted element and each present on value (or on-list value) counts one present element, and a checkbox whose template declares no on value or on list adds no present evidence even if it holds 1.
- Given the elements of a policy, when evidence is added, then if any element is present the elements add their count to the enabled evidence, and only when none is present do deleted elements add to the disabled evidence.
- Given the enabled and disabled evidence, when the state is settled, then the policy is Enabled when enabled exceeds disabled, Disabled when disabled exceeds enabled, Not configured when there is no evidence either way, and Unclear when both are equal and above zero.
- Given a policy and an area, when its state is shown, then it reads "Enabled", "Disabled", "Not Configured" or "Unknown", reading the computer source for the computer area and the user source for any other, and the screens receive the state of each policy in the area as plain facts.

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Terminologies

- Evidence: The settings found in a source that point to a policy being on or off; it is not the policy's final state, which is settled from all of it.

## Out of scope

- Anything a later story builds on top of this.
