# Mark a value for deletion or clear a key

## Story

As a person using the product, I want from the selected item, the person marks a value for deletion, or clears a key either completely, keeping its direct values, or by deleting one named value., so that a policy file can tell a machine to remove settings when policies are applied, so administrators must be able to record that intent..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Set, delete and forget values and key clearances in a policy file; Read and list values in policy files and registry policy keys; See and select the keys and values of a policy file; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip.

## Acceptance criteria

**AC-1: The value is not erased from the file but.**
Given a value is selected and not already a deletion entry, when the person deletes it, then the value is not erased from the file but replaced by a deletion entry named after it, which removes the value on the machine when policies are applied.

**AC-2: Three choices are offered and OK does nothing until.**
Given a key is selected, when the person deletes it, then three choices are offered and OK does nothing until one is chosen; cancelling or Escape changes nothing. Clear everything removes all values and marks the key cleared; Clear first marks it cleared and puts back only its existing direct values with ordinary content, losing deletion entries already in the key and not putting back values of sub-keys; Delete one value is refused with "You must enter a value name." when the name is empty, and otherwise removes any value of that name, whether or not it exists, and replaces it with a deletion entry.

## Terminologies

- Cleared key: A key marked so that applying policies removes the values the machine holds in it; not a key forgotten from the file.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Close the raw editor with Done or Escape; Add a key to a policy file; Add a value to the selected key; Edit the data of a value; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor; Start a registry file export of the selected key.
