# Add a key to a policy file

## Story

As a person using the product, I want the person types a new key name, and an empty key of that name is added under the selected key, or at the top level when nothing is selected., so that administrators need to create keys that policy definitions will later fill..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Read and list values in policy files and registry policy keys; See and select the keys and values of a policy file; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip; Set, delete and forget values and key clearances in a policy file.

## Acceptance criteria

**AC-1: The typed name is handed over unchecked; when it.**
Given the key name window is confirmed, when the name was typed, then the typed name is handed over unchecked; when it is cancelled, an empty name is handed over, so cancelling and typing nothing look the same.

**AC-2: They are told "The key name is not valid.".**
Given the typed name contains a backslash, when the person confirms, then they are told "The key name is not valid." and no key is added.

**AC-3: They are told "The key name is already taken.".**
Given a key of the same name, ignoring case, already exists under the same parent, when the person confirms, then they are told "The key name is already taken." and no key is added.

**AC-4: Nothing is added; otherwise, given a valid free name,.**
Given the name is empty or the window was cancelled, when the person adds a key, then nothing is added; otherwise, given a valid free name, an empty key of that name is created under the selected key, or at the top level when nothing is selected, and it is selected in the list.

## Terminologies

- Key: A named folder in a policy file that holds values and sub-keys; not a value.

## Journey

**Journey:** Add a key

**Before:**

New journey

**After:**

1. The person selects a parent key, or nothing for the top level.
2. They press Add key and type a name.
3. The new key appears in the list, selected.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Close the raw editor with Done or Escape; Add a value to the selected key; Edit the data of a value; Mark a value for deletion or clear a key; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor; Start a registry file export of the selected key.
