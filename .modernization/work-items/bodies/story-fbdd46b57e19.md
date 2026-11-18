# Inspect a policy's definition and its semantic policy text

## Story

As a person using the product, I want a person inspects a policy's registry value, client extension, presentation and elements, copies a line, and opens the policy details. The person also reads the policy, with its comment and option values, as semantic policy text., so that administrators need to see how a template defines a policy..

## Context

This ports behaviour of the existing product, described in the attachment: 13 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open details of a policy, category, product or support rule.

Open points, to settle before it is built:
- The legacy inspector stops with an unhandled error when a presentation item's ID matches no element; what should the person see instead?
- Text holding a quote or line break, and lone line feeds in comments, cannot be read back in the legacy program; should the new version escape them or keep this?

## Acceptance criteria

**AC-1: The selected line is copied only if a line.**
Given the inspector, when the person presses Ctrl+C, then the selected line is copied only if a line is selected.

**AC-2: A "Registry value" line shows only if it names.**
Given a policy, when inspected, then a "Registry value" line shows only if it names a registry value and a "Client extension" line only if it names one.

**AC-3: Display names resolve through the file defining the policy.**
Given choice elements, when inspected, then display names resolve through the file defining the policy and choices are numbered from zero in file order.

**AC-4: It states "User provides value names", a prefix, or.**
Given a list element, when inspected, then it states "User provides value names", a prefix, or "No prefix (values named for their data)".

**AC-5: It reads "Left implicit" if the policy names a.**
Given affected registry settings with no on or off setting, when inspected, then it reads "Left implicit" if the policy names a registry value, "Left to elements" if not; inside a Yes/No element always "Left implicit".

**AC-6: Presentation details list, each item with an ID matched.**
Given a policy with a presentation and elements, when inspected, then presentation details list, each item with an ID matched to the element with that ID; items without an ID show none.

**AC-7: The policy details open.**
Given the inspector, when the person presses the details button, then the policy details open.

**AC-8: There is one section per area it applies to,.**
Given a policy, when shown, then there is one section per area it applies to, the machine section from the computer source and comments, the user section from the user source; an uncovered area is left out.

**AC-9: The comment is included only when one is stored,.**
Given a section, when shown, then the comment is included only when one is stored, and option values only when the policy is Enabled.

**AC-10: It starts with 'C' for a machine policy or.**
Given a policy line, when written, then it starts with 'C' for a machine policy or 'U' for a user policy followed by the identifier.

**AC-11: Whole numbers have a leading #, unsigned numbers are.**
Given values, when written, then whole numbers have a leading #, unsigned numbers are digits, yes/no is True or False, text is single-quoted, an empty list is 'None', text lists are bracketed with double-quoted items, tables bracketed with name: value lines.

**AC-12: Backslashes are doubled and each CR+LF pair is written.**
Given a comment, when written, then backslashes are doubled and each CR+LF pair is written as '\n'.

## Terminologies

- Inspector: The window listing a policy's definition as written in the template; not the editor of its settings.
- Semantic policy text: A text script describing a policy's state and options; not a registry file.
