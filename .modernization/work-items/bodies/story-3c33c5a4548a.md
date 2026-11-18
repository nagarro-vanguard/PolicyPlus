# Add a value to the selected key

## Story

As a person using the product, I want the person chooses a value name and one of five kinds, then enters its data, and the value is stored under the selected key., so that administrators need to write a raw value that no policy definition covers..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Edit the data of a value; Read and list values in policy files and registry policy keys; See and select the keys and values of a policy file; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip; Set, delete and forget values and key clearances in a policy file.

## Acceptance criteria

**AC-1: String, Expandable string, List of strings, 32-bit DWord and.**
Given the new value window opens, when the person looks at it, then String, Expandable string, List of strings, 32-bit DWord and 64-bit QWord are offered with String chosen; confirming hands over the typed name unchecked, possibly empty, with the chosen kind, and cancelling hands over neither.

**AC-2: Its starting data is empty text, zero, or an.**
Given a name and kind are chosen, when the data window opens, then its starting data is empty text, zero, or an empty list by kind; if the person then confirms the data, the value is stored under the selected key and replaces without warning any value of the same name there, and if they do not confirm, nothing is stored.

## Terminologies

- Value: A named piece of data of one kind stored under a key in a policy file; not a key and not a policy.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Close the raw editor with Done or Escape; Add a key to a policy file; Edit the data of a value; Mark a value for deletion or clear a key; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor; Start a registry file export of the selected key.
