# Change the policy state and options within their limits

## Story

As a person using the product, I want the person picks Enabled, Disabled or Not configured and edits the options of an enabled policy, with each control accepting only what it allows, and list editing refusing duplicate names., so that the person can set exactly the values they want and cannot save values the policy cannot hold..

## Context

This ports behaviour of the existing product, described in the attachment: 9 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- What should the person see when a name cell in a named list was never filled in, which today stops the dialog with an unhandled error?
- Should pasted text that is not a number, or a negative number where the minimum is below zero, be accepted as today or refused?
- Should a list row with an empty value cell be refused rather than kept as an empty entry?

## Acceptance criteria

**AC-1: Only digits and control keys are accepted; other keys.**
Given a number box, when the person types, then only digits and control keys are accepted; other keys are ignored.

**AC-2: Any text a whole-number reading accepts stays, including a.**
Given a number box, when the text is kept, then any text a whole-number reading accepts stays, including a leading sign or spaces; a number over the maximum or under the minimum becomes that limit; other text becomes the default; and a number above 2,147,483,647 becomes the default even when the maximum is higher.

**AC-3: It is not restricted to digits; and when a.**
Given a number box, when text is pasted instead of typed, then it is not restricted to digits; and when a negative number is kept because the minimum is below zero, then it is converted to an unsigned number when the policy is applied.

**AC-4: It stays within the policy's minimum and maximum, moves.**
Given a number entered with a spin box, when it is changed, then it stays within the policy's minimum and maximum, moves in the presentation's steps and starts at the presentation's default.

**AC-5: It is limited to the policy's maximum length and.**
Given a plain text entry, when text is typed, then it is limited to the policy's maximum length and starts with the presentation's default text.

**AC-6: It is limited to the policy's maximum length, starts.**
Given a text entry with suggestions, when it is used, then it is limited to the policy's maximum length, starts with the default text and lists the suggestions, sorted unless the presentation turns sorting off.

**AC-7: It lists the choices by their translated names, sorted.**
Given a drop-down list, when it is shown, then it lists the choices by their translated names, sorted unless sorting is off, and preselects the default choice when one is named, otherwise nothing.

**AC-8: It starts in the presentation's default state.**
Given a check box, when it is first shown, then it starts in the presentation's default state.

**AC-9: It is refused with "Multiple entries are named "<name>"!.**
Given a list where the person names each entry, when the list editor is confirmed and two names are identical, then it is refused with "Multiple entries are named "<name>"! Remove or rename all but one." and nothing is returned; Run and run count as different names.

**AC-10: Every row except the empty new row at the.**
Given a list without names, when the list editor is confirmed, then every row except the empty new row at the bottom is returned in the order shown; for named lists the empty new row is also ignored.

**AC-11: That row is returned as an empty entry.**
Given a list without names, when a row's value cell was never filled in and the list editor is confirmed, then that row is returned as an empty entry.

## Terminologies

- List editor: The grid in which the person adds, names and removes the entries of a list option; not the policy dialog itself.

## Out of scope

The other tasks of this part of the product have their own stories: Show each option's stored value and save it in the right form; Open the policy dialog and finish it with OK, Apply or Cancel.
