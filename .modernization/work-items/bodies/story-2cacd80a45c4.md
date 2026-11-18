# Forget a key or a value without leaving a deletion mark

## Story

As a person using the product, I want the person removes a key with everything in it, or one value, from the policy file entirely, after confirming., so that sometimes the file should say nothing at all about a setting, rather than tell the machine to delete it..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Set, delete and forget values and key clearances in a policy file; Read and list values in policy files and registry policy keys; See and select the keys and values of a policy file; Read and write policy files with a byte-faithful round trip; Read and write the stored form of values in a policy file.

## Acceptance criteria

**AC-1: They are asked "Are you sure you want to.**
Given a key is selected, when the person chooses Forget, then they are asked "Are you sure you want to remove this key and all its contents?"; on Yes the key, all its sub-keys, every value and every clearing mark are removed with no deletion entry left, and No changes nothing; forgetting a selected value removes the value and its deletion entry the same way.

## Terminologies

- Forget: To remove an entry from the policy file leaving no deletion mark; not the same as deleting, which leaves a mark.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Close the raw editor with Done or Escape; Add a key to a policy file; Add a value to the selected key; Edit the data of a value; Mark a value for deletion or clear a key; Start a registry file import from the raw editor; Start a registry file export of the selected key.
