# Reset the limit choices or cancel them with Escape

## Story

As a person using the product, I want a person can return every limit choice to its default in one action, or press Escape to close the choices as cancelled with the current limit unchanged., so that people need a clean slate and a safe way out of the limit choices..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- The plan says undo puts back the limit held when the person began, but the legacy rule only closes as cancelled with the limit unchanged; if choices narrow the list live, what should undo restore?

## Acceptance criteria

**AC-1: Type, state and comment return to Any, Supported on.**
Given any limit choices are set, when the person resets, then type, state and comment return to Any, Supported on is unticked, both matching options are ticked and no product is ticked.

**AC-2: The choices close as cancelled and the current limit.**
Given the limit choices are open, when the person presses Escape, then the choices close as cancelled and the current limit is unchanged.

## Out of scope

The other tasks of this part of the product have their own stories: Narrow the policy list by type, state, comment and products.
