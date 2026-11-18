# Prove the journey: Limit the policy list to policies of a chosen type...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "See the limit currently in force.", then shows type, state, comment and products as the current limit holds, with Any and no products when it has no such condition and the support option off with both matching options on when it has no support condition..
- Given the product is ready, when the test does "Choose a policy type, state and comment status.", then keeps only managed for Policy, only unmanaged for Preference, the chosen state, and commented or uncommented as chosen; Any sets no condition. The list narrows now..
- Given the product is ready, when the test does "Limit by supported products.", then opens product choice only while a support limit is wanted; choosing a product by hand also chooses the products under it, but loading a limit does not spread; records chosen products and both matching options, and accepts a support limit with no product..
- Given the product is ready, when the test does "Be taken to the right place when the limit changes.", then turns the limit on and moves to the nearest category still shown..
- Given the product is ready, when the test does "Switch the limit on or off without losing it.", then applies or lifts the limit and moves to the nearest category still shown..
- Given the product is ready, when the test does "Start again from nothing.", then returns type, state and comment to Any, support off, both matching options on and no product..
- Given the product is ready, when the test does "Undo this round of changes.", then puts back the limit held when the person began and leaves it unchanged..

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Out of scope

- Anything a later story builds on top of this.
