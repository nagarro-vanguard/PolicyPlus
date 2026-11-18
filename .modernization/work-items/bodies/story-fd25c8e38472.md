# Apply option values to a policy and keep the dialog open

## Story

As a person using the product, I want a person presses Apply to save the policy and its option values, each written in the form its definition asks for, while the dialog stays open., so that windows reads these stored values, so the form and the key must match the definition exactly..

## Context

This ports behaviour of the existing product, described in the attachment: 9 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Save a policy's state with OK; Set, delete and forget values and key clearances in a policy file; Edit entries of a REG file within its source branch; Read and list values in policy files and registry policy keys; Forget a policy and list the registry values it touches; Open policy sources from imported files and describe them; Replace live registry changes with the registry source model; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip.

Open points, to settle before it is built:
- When the chosen choice position does not exist, the old program left the policy half set with no undo. Should the new product reject the save and write nothing instead?

## Acceptance criteria

**AC-1: The policy is written, the dialog stays open and.**
Given Apply, when pressed, then the policy is written, the dialog stays open and a change is recorded.

**AC-2: It goes under that key; otherwise under the policy's.**
Given a setting that names its own key, when it is saved, then it goes under that key; otherwise under the policy's key.

**AC-3: It is written as text if the definition says.**
Given a number option, when saved, then it is written as text if the definition says so, otherwise as a 32-bit number.

**AC-4: It is an expandable string if the definition says.**
Given a text option, when saved, then it is an expandable string if the definition says so, otherwise a plain string.

**AC-5: It is written as a multiple-string value.**
Given a multi-line text option, when saved, then it is written as a multiple-string value.

**AC-6: A ticked box with no on value first saves.**
Given a check box option, when saved, then a ticked box with no on value first saves 1 and an unticked box with no off value first removes the value, and the defined on or off value with its extra values then overwrites that.

**AC-7: Every existing value under its key is removed first.**
Given a list option that does not keep other entries, when saved, then every existing value under its key is removed first and a list with no entries stays empty.

**AC-8: Entries carrying names use them; otherwise each is numbered.**
Given list entries, when saved, then entries carrying names use them; otherwise each is numbered from 1 and named with the definition's prefix plus the number, or by its own text when there is no prefix.

**AC-9: The chosen item's value and its extra values are.**
Given a choice option, when saved, then the chosen item's value and its extra values are written.

## Terminologies

- Apply: Saving the policy and staying in the dialog; not closing it.

## Out of scope

The other tasks of this part of the product have their own stories: Open a policy setting and see its current state; Fill in a policy's option values; Save a policy's state with OK; Close the policy setting dialog and report changes.
