# Open the raw policy editor and work on its entries

## Story

As a person using the product, I want a person can start editing a policy file directly: a caution is shown the first time, the file's keys and values appear as an ordered tree with only the fitting actions offered, and leaving keeps the changes., so that advanced people can reach the raw keys and values of a policy file with a clear warning and a clear answer on whether their changes are kept..

## Context

This ports behaviour of the existing product, described in the attachment: 13 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open the chosen policy sources and keep the view on a visible category; Tell me once whether the workspace is ready to change; Hold a policy file's settings in memory and answer questions about them; Apply one policy file's changes onto another source.

Open points, to settle before it is built:
- When only one of User and Computer is backed by a policy file, is it taken without asking the person?
- Is the person shown a summary of what they changed, or a reminder about saving, when they leave the editor?

## Acceptance criteria

**AC-1: They are told "Neither loaded source is backed by.**
Given neither the user nor the computer policies come from a policy file, when a person tries to edit a policy file directly, then they are told "Neither loaded source is backed by a POL file."; and given some are, then the area they can pick is limited to those backed by a policy file.

**AC-2: User and Computer can each be picked only when.**
Given the question of which policies to edit is open, when the person looks at the choices, then User and Computer can each be picked only when that choice is switched on for this question.

**AC-3: Confirming does nothing; once User or Computer is chosen,.**
Given the question of which policies to edit is open, when no choice has been made yet, then confirming does nothing; once User or Computer is chosen, confirming returns that choice and closes the question.

**AC-4: It closes as cancelled.**
Given the question of which policies to edit is open, when the person presses Escape, then it closes as cancelled.

**AC-5: They see "Caution! This tool is for very advanced.**
Given a person has not yet accepted the caution, when they start editing directly, then they see "Caution! This tool is for very advanced users. Improper modifications may result in inconsistencies in policies' states."; choosing Yes continues and remembers the acceptance, and choosing No cancels and asks again next time.

**AC-6: Keys appear in alphabetical order ignoring case, each followed.**
Given the policy file is open, when the entries are shown, then keys appear in alphabetical order ignoring case, each followed by its indented sub-keys and then its values in alphabetical order, and a value with an empty name is not shown.

**AC-7: Each sub-key name appears only once regardless of case,.**
Given a key has sub-keys, when they are shown, then each sub-key name appears only once regardless of case, and the key itself is never shown among them.

**AC-8: "**deletevalues" appears as "Delete values" with its data, "**del.<name>".**
Given the file holds special deletion entries, when they are shown, then "**deletevalues" appears as "Delete values" with its data, "**del.<name>" as "Delete value" with the name, and entries starting "**delvals" as "Delete all values", and none of them can be edited or deleted.

**AC-9: Lists of text show joined by spaces, text as.**
Given the file holds ordinary values, when they are shown, then lists of text show joined by spaces, text as it is, 32-bit and 64-bit numbers in decimal and binary data as hexadecimal bytes separated by spaces, and other kinds show no content.

**AC-10: Only Add key and Export are available.**
Given nothing is selected in the list, when the person looks at the actions, then only Add key and Export are available.

**AC-11: Add key, Add value, Delete value, Forget and Export.**
Given a key is selected, then Add key, Add value, Delete value, Forget and Export are available and Edit is not; given a value is selected, then Forget is available, Add key, Add value and Export are not, and Edit and Delete value are available only if the value is not already a deletion entry.

**AC-12: The editor closes as accepted, and when they press.**
Given the person is editing a policy file, when they press Done or Enter, then the editor closes as accepted, and when they press Escape, then it closes as cancelled; there is no Cancel button, and either way every change they made stays on the loaded policies and reaches disk only when policies are saved.

## Terminologies

- Raw policy editing: Working directly on the keys and values stored in a policy file; not choosing settings through the policy browser.
- Deletion entry: A special entry in a policy file that marks a value or all values of a key for removal; not an ordinary value.

## Journey

**Journey:** The system picks the area

**Before:**

New journey

**After:**

1. Start editing the policy file, understanding the risk the first time
2. Find and work on entries in the file
3. See what I have changed before leaving, then finish
