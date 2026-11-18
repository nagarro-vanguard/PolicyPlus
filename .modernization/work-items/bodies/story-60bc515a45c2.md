# Inspect a policy's technical makeup and copy its lines

## Story

As a person using the product, I want let someone open a policy and read a plain summary of what it stores and where, then ask for the presentation and element detail and the semantic text of the policy only when they want each part. Let them copy a selected line of the inspection., so that most readers want the gist of a policy before the detail, so the technical makeup stays one request away instead of in the way..

## Context

This ports behaviour of the existing product, described in the attachment: 13 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- What should the inspection show when a presentation item names an element ID that no element has, given the old program stopped with an unhandled error?
- Should semantic text that holds a quote or a line break that cannot be read back be flagged to the person, as the step describes, and in what words?

## Acceptance criteria

**AC-1: The summary shows a "Registry value" line; given it.**
Given a policy that names a registry value, when someone opens its inspection, then the summary shows a "Registry value" line; given it names none, then no such line appears.

**AC-2: The summary shows a "Client extension" line; given it.**
Given a policy that names a client extension, when someone opens its inspection, then the summary shows a "Client extension" line; given it names none, then no such line appears.

**AC-3: The details are listed whatever the elements hold, and.**
Given a policy with both a presentation and elements, when someone asks for the presentation detail, then the details are listed whatever the elements hold, and each presentation item with an ID shows the details of the element with the same ID, while items without an ID show none.

**AC-4: Each choice is named as the file that defines.**
Given a choice element, when its detail is shown, then each choice is named as the file that defines the policy names it and numbered from zero in the order of that file.

**AC-5: It says "User provides value names" if the person.**
Given a list element, when its detail is shown, then it says "User provides value names" if the person names the values, the prefix if the element has one, and otherwise "No prefix (values named for their data)".

**AC-6: It reads "Left implicit" if the policy names a.**
Given a group of affected registry settings with no on or off setting, when the detail is shown, then it reads "Left implicit" if the policy names a registry value and "Left to elements" if it names none; inside a Yes/No element it always reads "Left implicit".

**AC-7: There is one section per area it applies to,.**
Given a policy that applies to computers, users or both, when someone asks for its semantic text, then there is one section per area it applies to, reading that area's stored settings and comment, and an area the policy does not cover is left out.

**AC-8: Its heading line starts with C for a computer.**
Given a section of semantic text, when it is written, then its heading line starts with C for a computer policy or U for a user policy, followed by the policy identifier.

**AC-9: Its settings and option values are left out; given.**
Given a policy that is not Enabled, when its semantic text is written, then its settings and option values are left out; given it is Enabled, then they are listed.

**AC-10: The comment appears in that section; given none is.**
Given a policy with a stored comment, when its semantic text is written, then the comment appears in that section; given none is stored, then no comment appears.

**AC-11: A whole number has a leading #, an unsigned.**
Given option values in semantic text, when they are written, then a whole number has a leading #, an unsigned number is plain digits, yes/no is True or False, text sits between single quotes, an empty list reads 'None', a list of text is bracketed with one double-quoted item per line, and a table is bracketed as double-quoted name: value lines.

**AC-12: Each backslash is doubled and each carriage return plus.**
Given a comment with backslashes or Windows line breaks, when the semantic text is written, then each backslash is doubled and each carriage return plus line feed pair is written as \n, while a lone line feed or lone carriage return is written as it is. Also: given a line is selected in the inspection, when someone presses Ctrl+C, then that line is placed on the clipboard. Also: given no line is selected in the inspection, when someone presses Ctrl+C, then nothing is copied.

## Terminologies

- Semantic text: The written form of a policy's settings, one section per area, that can be moved in and out of the program; it is not the registry file form.
- Inspection: The technical view of one policy showing what it stores, its presentation and elements and its semantic text; it is not the plain description shown when browsing.

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions and undo a mistaken clear; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Choose which policies and categories the tree shows; Read what a category or policy is for; Open an item and offer only the actions that fit it; Review and merge identical user and computer policies; Browse products, their versions and details in one view.
