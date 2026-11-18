# Inspect a policy's stored setting and presentation, and copy a line

## Story

As a person using the product, I want let someone open a policy and read a plain summary of what it stores and where, then ask for the presentation and element detail only when wanted, and copy a selected line of the inspection., so that most readers want the gist of a policy before the detail, so the technical makeup stays one request away instead of in the way..

## Context

This ports behaviour of the existing product, described in the attachment: 7 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show a policy's semantic text on request.

Open points, to settle before it is built:
- What should the inspection show when a presentation item names an element ID that no element has, given the old program stopped with an unhandled error?

## Acceptance criteria

**AC-1: The summary shows a "Registry value" line; given it.**
Given a policy that names a registry value, when someone opens its inspection, then the summary shows a "Registry value" line; given it names none, then no such line appears.

**AC-2: The summary shows a "Client extension" line; given it.**
Given a policy that names a client extension, when someone opens its inspection, then the summary shows a "Client extension" line; given it names none, then no such line appears.

**AC-3: The details are listed whatever the elements hold, and.**
Given a policy with both a presentation and elements, when someone asks for the presentation detail, then the details are listed whatever the elements hold, and each presentation item with an ID shows the details of the element with the same ID, while items without an ID show none.

**AC-4: The choice names come from the definitions file that.**
Given a choice element, when its detail is shown, then the choice names come from the definitions file that defines the policy, and the choices are numbered from zero in the order of that file.

**AC-5: It says "User provides value names" if the person.**
Given a list element, when its detail is shown, then it says "User provides value names" if the person names the values, the prefix if the element has one, and otherwise "No prefix (values named for their data)".

**AC-6: It reads "Left implicit" if the policy names a.**
Given a group of affected registry settings with no on or off setting, when the detail is shown, then it reads "Left implicit" if the policy names a registry value and "Left to elements" if it names none; inside a Yes/No element it always reads "Left implicit".

**AC-7: That line is placed on the clipboard.**
Given a line is selected in the inspection, when someone presses Ctrl+C, then that line is placed on the clipboard.

**AC-8: Nothing is copied.**
Given no line is selected in the inspection, when someone presses Ctrl+C, then nothing is copied.

## Terminologies

- Inspection: The technical view of one policy showing what it stores, its presentation and elements and its semantic text; it is not the plain description shown when browsing.

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions from the workspace; Show a policy's semantic text on request; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Choose which policies and categories the tree shows; Read what a category or policy is for; Open an item and offer only the actions that fit it; Review and merge identical user and computer policies; Browse products, their versions and details in one view.
