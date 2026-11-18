# Choose where to add policy definitions from

## Story

As a person using the product, I want a person opens the 'add policy definitions' window, chooses where the templates come from, decides whether to clear the loaded definitions first, and then confirms or cancels. Because the product runs in a browser and cannot see the person's folders, the folder choices are replaced by choosing template files (ADMX and ADML) from their own computer., so that administrators need to load the right set of policy templates before they can browse or edit any policy, and need a clear refusal when nothing usable was chosen..

## Context

This ports behaviour of the existing product, described in the attachment: 5 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- The old window offered 'the Windows policy definitions folder'; should the new one offer the stored Microsoft package or the installed definitions in its place, or drop that choice?
- What exact wording should the refusal show when no files, or no readable template files, were chosen (the old text spoke of a folder that does not exist)?

## Acceptance criteria

**AC-1: The choice to pick files from their own computer.**
Given the window has just opened, when the person looks at it, then the choice to pick files from their own computer is already selected, and the file picker and file list are usable.

**AC-2: The file picker and file list are not usable,.**
Given the window is open and another source choice is shown, when the person selects a choice other than picking files from their own computer, then the file picker and file list are not usable, and when they select picking files again, then both become usable.

**AC-3: No folder or domain choice is offered, and the.**
Given the product cannot reach the person's folders, the Windows folder or a domain's shared policy folder, when the window opens, then no folder or domain choice is offered, and the person can load a domain's definitions only by picking the files they copied from it.

**AC-4: The picked file names appear in the list; and.**
Given the person presses the browse button, when they pick files in their computer's file dialog, then the picked file names appear in the list; and when they close that dialog without picking, then the list is unchanged.

**AC-5: The window closes as accepted and those files are.**
Given the person has picked template files, when they press OK, then the window closes as accepted and those files are the ones added to the loaded definitions.

**AC-6: They are told what is missing and the window.**
Given nothing usable has been chosen, when the person presses OK, then they are told what is missing and the window stays open.

**AC-7: It is ticked; and given they press OK with.**
Given the window opens, when the person looks at the option to clear the loaded definitions before adding, then it is ticked; and given they press OK with usable files, then their tick or untick is passed on, while given the window was cancelled or refused, then no choice is passed on.

**AC-8: The window closes as cancelled and nothing is chosen.**
Given the window is open, when the person presses Escape, then the window closes as cancelled and nothing is chosen or added.

## Terminologies

- Policy definitions: The administrative template files (ADMX and ADML) that describe the available policies; they are not the policy settings a person has chosen.
- Clear before adding: The option to remove the definitions already loaded before the new ones are added; it is not a deletion of any policy setting.

## Journey

**Journey:** Add policy definitions

**Before:**

New journey

**After:**

1. Open the window to add policy definitions
2. Choose where the definitions come from
3. Pick the template files to add
4. Decide whether to clear the loaded definitions first
5. Confirm to add them, or cancel
