# Choose whether to work on user or computer policies

## Story

As a person using the product, I want a small choice window asks which area, User or Computer, the person wants to work on, and offers only the areas the task allows., so that importing, exporting and raw editing all act on one area at a time, so the person must say which one before anything changes..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: Nothing happens; once one is chosen, OK reports that.**
Given the choice window is open, when the person presses OK before choosing User or Computer, then nothing happens; once one is chosen, OK reports that area to the task that asked and closes the window as accepted.

**AC-2: The window closes as cancelled and no area is.**
Given the choice window is open, when the person presses Escape, then the window closes as cancelled and no area is chosen.

## Terminologies

- Area: One of the two halves of policy settings, User policies or Computer policies; not a single policy and not a file.
