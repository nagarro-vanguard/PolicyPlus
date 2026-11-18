# Fill in a policy's option values

## Story

As a person using the product, I want a person fills in a policy's options (numbers, text, choices, check boxes, lists), with each control starting from its default and limited by what the policy allows., so that every Enabled policy is only as useful as the option values the person can set correctly..

## Context

This ports behaviour of the existing product, described in the attachment: 8 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: It starts with the presentation's default state.**
Given a check box option, when the dialog opens, then it starts with the presentation's default state.

**AC-2: It is limited to the policy's maximum length and.**
Given a plain text option, when it is shown, then it is limited to the policy's maximum length and starts with the default text.

**AC-3: It is limited to the policy's minimum and maximum,.**
Given a number spin box, when it is shown, then it is limited to the policy's minimum and maximum, moves in the presentation's steps and starts at the default.

**AC-4: The choices appear by translated name, sorted unless sorting.**
Given a drop-down, when it is shown, then the choices appear by translated name, sorted unless sorting is off, with the default preselected when one is named, otherwise nothing selected.

**AC-5: It is limited to the maximum length, starts with.**
Given a text option with suggestions, when it is shown, then it is limited to the maximum length, starts with the default text and lists the suggestions, sorted unless sorting is off.

**AC-6: Text a whole-number reading accepts is kept (including sign.**
Given a plain number box, when text is entered, then text a whole-number reading accepts is kept (including sign or spaces), other text becomes the default, a number beyond the maximum or minimum becomes that limit, a number above 2,147,483,647 becomes the default, and a kept negative is converted to unsigned when applied; pasted text is not restricted.

**AC-7: It is ignored.**
Given a number box, when a key other than a digit or control key is typed, then it is ignored.

**AC-8: Each option shows the stored value: numbers, text, the.**
Given a policy that is Enabled in the section, when the dialog opens, then each option shows the stored value: numbers, text, the matching drop-down item, check box state, multi-line lines and the stored list.

**AC-9: What it returns is kept as the option's value.**
Given a list option, when the person opens the list editor and confirms, then what it returns is kept as the option's value.

## Terminologies

- Option: One configurable value of a policy such as a number, text or choice; not the policy's state.

## Out of scope

The other tasks of this part of the product have their own stories: Open a policy setting and see its current state; Apply option values to a policy and keep the dialog open; Save a policy's state with OK; Close the policy setting dialog and report changes.
