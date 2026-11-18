# Show each option's stored value and save it in the right form

## Story

As a person using the product, I want a policy opens with each option showing the value stored for it, and when it is saved each option's value is stored in the form and place that suits it., so that the person sees what is really set today, and what they save behaves as the policy expects..

## Context

This ports behaviour of the existing product, described in the attachment: 15 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Hold a policy file's settings in memory and answer questions about them; Read and write the machine's live policy settings.

Open points, to settle before it is built:
- What should the person see when a stored number or text is missing or of the wrong kind, since today it is not checked (including multi-line text)?

## Acceptance criteria

**AC-1: It is taken as stored without being checked first.**
Given a stored number, text or multi-line text is missing or of another kind, when the policy is opened, then it is taken as stored without being checked first.

**AC-2: It shows the first item whose own value is.**
Given a drop-down choice option, when it is opened, then it shows the first item whose own value is stored and, if the item has a list of values, whose values are all stored; nothing is selected when no item matches.

**AC-3: A list whose entries are named by the person.**
Given a list option, when it is opened, then a list whose entries are named by the person shows every stored name with its value; and a list whose names do not matter shows the stored values in order: with a name prefix, those named prefix1, prefix2 and so on until the first number that is missing, and without a prefix, every stored value under the list's key.

**AC-4: It is ticked when its on value, or every.**
Given a check box option, when it is opened, then it is ticked when its on value, or every value of its on list, is stored, or, when neither is defined, when its value is 1; otherwise it is unticked, including when its off value is stored.

**AC-5: It counts as present only when every value in.**
Given a list of values is looked for in the stored values, when it is checked, then it counts as present only when every value in it is present.

**AC-6: It is stored as text if the definition says.**
Given a number option is saved, when it is written, then it is stored as text if the definition says to store it as text, otherwise as a whole number.

**AC-7: It is stored as text that can contain variables.**
Given a text option is saved, when it is written, then it is stored as text that can contain variables if the definition says so, otherwise as plain text; and a multi-line text option is stored as a set of lines.

**AC-8: Entries with their own names keep them; others are.**
Given a list option is saved, when it is written, then entries with their own names keep them; others are numbered from 1 with the definition's prefix, or named after their own text when there is no prefix.

**AC-9: Every existing value under the list's key is removed.**
Given a list option is saved and the definition does not say to keep other entries, when it is written, then every existing value under the list's key is removed first, and a list with no entries stays empty.

**AC-10: A ticked box with no on value first saves.**
Given a check box is saved, when it is written, then a ticked box with no on value first saves 1 and an unticked box with no off value first removes the value; any defined on or off value is then saved with its extra values and replaces that first step.

**AC-11: It is stored there, otherwise with the policy's other.**
Given an option names its own location, when it is saved, then it is stored there, otherwise with the policy's other settings.

**AC-12: It is removed; a number is saved as a.**
Given a value is written for a policy and its definition says to delete, then it is removed; a number is saved as a whole number, text as text, and a policy with no value defined writes nothing.

## Journey

**Journey:** Review what will change

**Before:**

New journey

**After:**

1. Open the policy with everything already worked out
2. Say what state it should be in and change only what differs
3. Review the forecast of changes
4. Confirm, then carry on or finish

## Out of scope

The other tasks of this part of the product have their own stories: Change the policy state and options within their limits; Open the policy dialog and finish it with OK, Apply or Cancel.
