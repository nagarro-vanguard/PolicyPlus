# Clear a policy's old settings and write its chosen state

## Problem

- The policy ends up exactly in the state the person chose, with no leftovers from before.
- Open point: Should the person see a forecast of what saving will change and confirm it before anything is written? No rule describes one, so its layout and whether it can be turned off are undecided.
- Open point: When Enabled is chosen, which holds when one rule writes every option and another writes only the settings supplied: is a setting left as it was only when the person was never offered it?
- Open point: Where should the person be told what will happen to the comment when the source holds no comments?

## Goal

- When a policy is applied, its old settings are cleared and the chosen state is written: Enabled with its values, Disabled, or Not configured.

## Acceptance criteria

- Given a policy is applied, when its old settings are cleared, then every value it touches is removed from the source, counted once: its own value, its value lists, its options' values, those of check boxes and choices, and the whole key of each list option; the policy then reads as Not configured.
- Given the source is a REG file, when a list's whole key is cleared, then its removal entry is dropped if there is one; the request is ignored when a source branch is set and the key lies outside it, and every key is accepted when no branch is set.
- Given the source is a policy file, when a list's whole key is cleared, then every "clear all" mark for that key is removed.
- Given Enabled is chosen, when the policy is applied, then its own on value is saved, with any extra on values; and when it has a value name but no on value, the number 1 is saved; a list key left blank uses the policy's key.
- Given Enabled is chosen, when the policy is applied, then every option of the policy is saved with its current value, including options never filled in.
- Given Enabled is chosen and a setting was given no value, when the policy is applied, then that setting is left as it was.
- Given Disabled is chosen and the definition gives no off value, when the policy is applied, then the policy's value is removed; a defined off value, with any extra off values, is saved instead.
- Given Disabled is chosen, when the policy is applied, then each setting gets only its own removal: all values under a list's key, the saved off value of a check box that has one, and the single value of every other setting; extra values for a chosen item, a check box's on list and the policy's own on list stay.
- Given Not configured or an unknown state is chosen, when the policy is applied, then nothing is written or removed beyond the clearing of its old settings.

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

- Not configured: The policy has no settings in the chosen side; not the same as Disabled, which is a setting of its own.

## Out of scope

- Anything a later story builds on top of this.
