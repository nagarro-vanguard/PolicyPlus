# Confirm or cancel the chosen policy sources

## Story

As a person using the product, I want pressing OK in the policy sources dialog creates the computer and user sources from the choices made, and keeps the dialog open with the reason when one cannot be created. Pressing Escape cancels., so that the person only moves on with two working sources, and can back out without changing anything..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open policy sources from imported files and describe them; Resolve where each policy source comes from and whether it can be saved.

Open points, to settle before it is built:
- What does creating a Local GPO source from the choice mean in the target product, since no source of its content is stated?

## Acceptance criteria

**AC-1: The source is created from the choice (Local GPO,.**
Given a computer choice, when the person presses OK, then the source is created from the choice (Local GPO, Registry with the typed path, POL file with the typed name, or Scratch space when none is chosen); if it cannot be created, then they are told "The computer policy loader could not be created." followed by the reason and the dialog stays open.

**AC-2: The source is created from the choice (Local GPO,.**
Given a user choice, when the person presses OK, then the source is created from the choice (Local GPO, Registry, POL file, per-user GPO with the typed SID, user hive with the typed file path, or Scratch space otherwise); if it cannot be created, then they are told "The user policy loader could not be created." followed by the reason and the dialog stays open; the dialog closes as accepted only when both sources were created.

**AC-3: It closes as cancelled.**
Given the dialog is open, when the person presses Escape, then it closes as cancelled.

## Journey

**Journey:** Choose where policies are kept

**Before:**

New journey

**After:**

1. Open the policy sources dialog
2. Choose the computer source
3. Choose the user source
4. Press OK, or Escape to cancel

## Out of scope

The other tasks of this part of the product have their own stories: Choose the computer policy source; Choose the user policy source.
