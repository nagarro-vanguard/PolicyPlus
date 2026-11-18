# See and select the keys and values of a policy file

## Story

As a person using the product, I want the raw editor lists every key of the uploaded policy file with its sub-keys and values, shows special deletion entries as such, and offers only the buttons that fit what is selected., so that administrators who edit a policy file directly need to see exactly what it holds and be stopped from actions that make no sense for the selected item..

## Context

This ports behaviour of the existing product, described in the attachment: 7 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: Keys are listed in alphabetical order ignoring case, each.**
Given a policy file with several keys, when the editor opens, then keys are listed in alphabetical order ignoring case, each followed by its indented sub-keys and then its values in alphabetical order, and a value with an empty name (the marker that keeps an empty key) is not listed.

**AC-2: It appears only once and the key being listed.**
Given a key name appears more than once with different letter case, when sub-keys are listed, then it appears only once and the key being listed is never listed as its own sub-key.

**AC-3: A list of text shows its items joined by.**
Given ordinary values of several kinds, when they are listed, then a list of text shows its items joined by spaces, text shows as it is, 32-bit and 64-bit numbers show in decimal, binary data shows as hexadecimal bytes separated by spaces, and other kinds show no content.

**AC-4: The delete-values entry shows as "Delete values" with its.**
Given special deletion entries, when they are listed, then the delete-values entry shows as "Delete values" with its data, an entry that deletes one value shows as "Delete value" with the name, and entries that clear everything show as "Delete all values"; none of them can be edited or deleted.

**AC-5: Only Add key and Export are available and Add.**
Given nothing is selected in the list, when the person looks at the buttons, then only Add key and Export are available and Add value, Delete value, Edit and Forget are unavailable.

**AC-6: Add key, Add value, Delete value, Forget and Export.**
Given a key is selected, when the person looks at the buttons, then Add key, Add value, Delete value, Forget and Export are available and Edit is unavailable.

**AC-7: Forget is always available, Add key, Add value and.**
Given a value is selected, when the person looks at the buttons, then Forget is always available, Add key, Add value and Export are unavailable, and Edit and Delete value are available only when the value is not already a deletion entry.

## Terminologies

- Policy file: The file of raw registry-style keys and values that holds policy settings for one area; not the policy definitions that describe them.
- Deletion entry: A special entry in a policy file that tells the machine to remove a value or all values when policies are applied; not an ordinary value.

## Journey

**Journey:** Review a policy file in the raw editor

**Before:**

New journey

**After:**

1. The person opens the raw editor on an uploaded policy file.
2. They read the list of keys, sub-keys and values.
3. They select a key or a value and see which actions are available.

## Out of scope

The other tasks of this part of the product have their own stories: Close the raw editor with Done or Escape; Add a key to a policy file; Add a value to the selected key; Edit the data of a value; Mark a value for deletion or clear a key; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor; Start a registry file export of the selected key.
