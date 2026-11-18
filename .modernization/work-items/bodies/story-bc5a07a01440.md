# Enter list entries for a policy option

## Story

As a person using the product, I want a person edits a list option in a grid and confirms it; entries are returned in order, and named lists refuse duplicate names., so that list options such as allowed programs need entries the person can add, rename and check..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- What should happen when a name cell of a named list was never filled in? The old program stopped with an unhandled error.

## Acceptance criteria

**AC-1: It is refused with "Multiple entries are named "<name>"!.**
Given a list where the person names each entry, when two entries have exactly the same name and OK is pressed, then it is refused with "Multiple entries are named "<name>"! Remove or rename all but one." and nothing is returned; Run and run count as two entries.

**AC-2: Every row except the empty new row at the.**
Given a list without names, when OK is pressed, then every row except the empty new row at the bottom is returned in the order shown, even a row with an empty value; for named lists the new row is ignored.

## Terminologies

- List editor: The grid in which a list option's entries are typed; not the policy dialog itself.
