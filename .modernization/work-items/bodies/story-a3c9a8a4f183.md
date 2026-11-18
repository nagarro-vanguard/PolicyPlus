# Edit the data of a value

## Story

As a person using the product, I want the person changes the data of the selected value in a text, number or list-of-text window that fits its kind., so that administrators correct raw values without recreating them..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Read and list values in policy files and registry policy keys; See and select the keys and values of a policy file; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip; Set, delete and forget values and key clearances in a policy file.

## Acceptance criteria

**AC-1: A plain or expandable text value opens a text.**
Given a value is selected, when the person edits it, then a plain or expandable text value opens a text box, a 32-bit or 64-bit number a number box and a list of text a multi-line box; any other kind, such as binary, is refused with "This value kind is not supported." and nothing changes; cancelling leaves the value as it was.

**AC-2: A 32-bit value accepts 0 to 4,294,967,295 and a.**
Given the number box is open, when the person types a number, then a 32-bit value accepts 0 to 4,294,967,295 and a 64-bit value accepts 0 to 18,446,744,073,709,551,615.

**AC-3: The value keeps its name and kind, its data.**
Given the person confirms new data, when it is stored, then the value keeps its name and kind, its data is replaced and it stays selected.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Close the raw editor with Done or Escape; Add a key to a policy file; Add a value to the selected key; Mark a value for deletion or clear a key; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor; Start a registry file export of the selected key.
