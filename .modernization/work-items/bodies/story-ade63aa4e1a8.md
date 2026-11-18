# Load a SPOL script into the import window

## Story

As a person using the product, I want a person opens a SPOL file, edits its text, resets it, and leaves the window with Escape., so that sPOL text is how settings move between machines; the person needs to prepare it before applying..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: The whole file replaces the typed text without asking.**
Given the person picks a SPOL file, when it is opened, then the whole file replaces the typed text without asking or checking; the file arrives by upload.

**AC-2: Any earlier parsed result is discarded so a cancelled.**
Given the import window opens, when it is shown, then any earlier parsed result is discarded so a cancelled session passes nothing back.

**AC-3: The window closes as cancelled; when text is selected,.**
Given no text is selected, when Escape is pressed, then the window closes as cancelled; when text is selected, Escape closes nothing.

**AC-4: All text is selected.**
Given the text box, when Ctrl+A is pressed, then all text is selected.

**AC-5: The text becomes the header and blank lines.**
Given the person confirms with Yes to "Are you sure you want to reset the text box?", when Reset is chosen, then the text becomes the header and blank lines.

## Terminologies

- SPOL: Semantic policy text that lists policies with their state and options; not a registry file.

## Journey

**Journey:** Import settings from SPOL

**Before:**

New journey

**After:**

1. Open the import window
2. Open a SPOL file or type text
3. Verify it
4. Apply it
5. Read the result message

## Out of scope

The other tasks of this part of the product have their own stories: Read, verify and apply SPOL text in the import window.
