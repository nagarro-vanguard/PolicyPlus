# Save a policy's state with OK

## Story

As a person using the product, I want a person saves Enabled, Disabled or Not configured with options and comment by pressing OK, which closes the dialog., so that this is the product's purpose: changing what a policy is set to..

## Context

This ports behaviour of the existing product, described in the attachment: 11 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Set, delete and forget values and key clearances in a policy file; Edit entries of a REG file within its source branch; Read and list values in policy files and registry policy keys; Apply option values to a policy and keep the dialog open; Forget a policy and list the registry values it touches; Open policy sources from imported files and describe them; Replace live registry changes with the registry source model; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip.

## Acceptance criteria

**AC-1: Everything the source holds for that policy is forgotten.**
Given a policy being saved, when OK or Apply is pressed, then everything the source holds for that policy is forgotten first, then the chosen state is written.

**AC-2: Nothing is written or removed beyond the forgetting, so.**
Given Not configured or Unknown, when saved, then nothing is written or removed beyond the forgetting, so the policy ends with no values.

**AC-3: Every option is written whatever its value, including options.**
Given Enabled is chosen, when applied, then every option is written whatever its value, including options never filled in.

**AC-4: Only supplied settings are written and unsupplied ones are.**
Given Enabled and settings the person supplied, when written, then only supplied settings are written and unsupplied ones are left as they were.

**AC-5: The policy's own on value and its extra on.**
Given Enabled, when saved, then the policy's own on value and its extra on values are saved, a blank list key falling back to the policy's key, and the number 1 when the policy has a value name but no on value.

**AC-6: A value defined as delete is removed, a number.**
Given a registry value to write for a policy, then a value defined as delete is removed, a number is saved as 32-bit, text as text, and a policy with no value writes nothing.

**AC-7: With no off value the registry value is removed,.**
Given Disabled, when saved, then with no off value the registry value is removed, otherwise the off value and its extra off values are saved.

**AC-8: Each setting gets only its own removal: lists lose.**
Given Disabled, when saved, then each setting gets only its own removal: lists lose all values under their key, check boxes with an off value or list get it saved, others lose their single value, and extra on values are left in place.

**AC-9: An empty comment removes the stored comment and any.**
Given a source that supports comments, when applied, then an empty comment removes the stored comment and any text replaces or adds it.

**AC-10: The policy is written and the dialog closes as.**
Given OK, when pressed, then the policy is written and the dialog closes as a change.

**AC-11: The write goes to the stored policy settings for.**
Given the legacy registry and Group Policy sources, when saving, then the write goes to the stored policy settings for the section.

## Out of scope

The other tasks of this part of the product have their own stories: Open a policy setting and see its current state; Fill in a policy's option values; Apply option values to a policy and keep the dialog open; Close the policy setting dialog and report changes.
