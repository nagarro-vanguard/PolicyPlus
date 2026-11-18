# Clear all loaded policy definitions from the workspace

## Story

As a person using the product, I want a person can close the workspace from the menu, which clears every loaded policy definition at once with no confirmation. Putting back what was cleared after a mistake is planned, but its behaviour is still open., so that clearing stays as quick as people expect, and a mistaken clear should no longer mean reloading everything from the folders..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- The plan adds a new step with no existing rule: after a clear the system says what was removed and restores it on request. What exactly should it say about what was removed?
- When the person asks to undo, are the removed definitions loaded again exactly as they were?
- Does undo also bring back the previous search results, or only the loaded definitions?
- How long is the way back offered: until the next load, until the next action, or for a set time?

## Acceptance criteria

**AC-1: All loaded definitions are removed at once, no confirmation.**
Given policy definitions are loaded, when the person closes the workspace from the menu, then all loaded definitions are removed at once, no confirmation is asked, and the view is rebuilt.

**AC-2: All loaded definitions and the previous search results are.**
Given definitions were loaded and a search had been run, when the workspace is closed or replaced by a new one, then all loaded definitions and the previous search results are discarded.

## Terminologies

- Loaded definitions: The policy definitions currently open in the workspace for browsing; not the definition files kept in the folders they were read from.
- Workspace: Everything the person has open in the program: the loaded definitions and the previous search results; not the folders the definitions were read from.
- Previous search results: The results of searches run earlier in the workspace; not the policies that are loaded.

## Journey

**Journey:** Clear with a way back

**Before:**

New journey

**After:**

1. Remove all loaded definitions.
2. Undo it if it was a mistake.

## Out of scope

The other tasks of this part of the product have their own stories: Show a policy's semantic text on request; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Choose which policies and categories the tree shows; Read what a category or policy is for; Open an item and offer only the actions that fit it; Review and merge identical user and computer policies; Browse products, their versions and details in one view; Inspect a policy's stored setting and presentation, and copy a line.
