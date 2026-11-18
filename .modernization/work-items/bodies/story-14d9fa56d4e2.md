# Add a new key to a policy file with its name checked

## Story

As a person using the product, I want a person adding a key to a policy file gives it a name and is told when the name cannot be used; a usable name creates an empty key under the selected key, or at the top level when nothing is selected, and selects it., so that the person learns that a name is refused before the key is added, and ends with the new key selected and ready to hold values..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Hold a policy file's settings in memory and answer questions about them.

Open points, to settle before it is built:
- Is a refused name shown while it is being typed, or only when the person confirms?
- When the name box appears, should the cursor be in it with any text already there selected?
- Should pressing Escape close the name box as a cancel?

## Acceptance criteria

**AC-1: The person is told "The key name is already.**
Given a key of the same name, ignoring case, already exists under the same parent, when that name is proposed for a new key, then the person is told "The key name is already taken." and no key is added.

**AC-2: The person is told "The key name is not.**
Given a name containing a backslash, when it is proposed for a new key, then the person is told "The key name is not valid." and no key is added.

**AC-3: The typed name is passed on exactly as typed,.**
Given the person confirms the name dialog, then the typed name is passed on exactly as typed, without being checked at that point.

**AC-4: It is treated the same as an empty name.**
Given the person cancels the name dialog, then it is treated the same as an empty name.

**AC-5: Nothing is added.**
Given the name is left empty or the dialog is cancelled, when a key is being added, then nothing is added.

**AC-6: An empty key of that name is created under.**
Given a name is given and a key is selected, when the key is added, then an empty key of that name is created under the selected key and is selected in the list.

**AC-7: An empty key of that name is created at.**
Given a name is given and nothing is selected, when the key is added, then an empty key of that name is created at the top level and is selected in the list.

## Terminologies

- Key: A named folder in a policy file that holds values and other keys; not a value itself.

## Journey

**Journey:** Checked as you type

**Before:**

New journey

**After:**

1. Give the new key a name and know at once whether it is usable
2. Have the key created and selected

## Out of scope

The other tasks of this part of the product have their own stories: Add a new value to a policy file by its name and data together; Change the data of a value in a policy file in either number form; Remove a selected value or key by deletion entry or clearing; Forget a key or value entirely; Export a policy source as a registry settings file.
