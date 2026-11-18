# Show a category's parent and let people go up to it

## Story

As a person using the product, I want open a category from the category list, or the category a policy sits in, and see its details with its parent's name and a way to go to the parent in the same window., so that people can see where a category belongs and move to its parent, and a parent that has gone missing is shown as such instead of leading nowhere..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Should the details also list the policies the category holds?
- Should the details show the whole chain of parents at once, instead of one parent at a time?

## Acceptance criteria

**AC-1: The details show the parent's name.**
Given a category whose parent exists, when the person opens its details from the category list or from the category a policy sits in, then the details show the parent's name.

**AC-2: The button to go to the parent is available.**
Given a category whose parent exists, when the person looks at its details, then the button to go to the parent is available.

**AC-3: The parent shows as "<orphaned from <parent name>>" instead.**
Given a category whose parent is named but missing from the loaded definitions, when the person opens its details, then the parent shows as "<orphaned from <parent name>>" instead of a name.

**AC-4: The button to go to the parent is disabled.**
Given a category whose parent is named but missing, when the person looks at its details, then the button to go to the parent is disabled.

**AC-5: No parent is shown.**
Given a top-level category, when the person opens its details, then no parent is shown.

**AC-6: The same window shows that parent's details.**
Given the details of a category whose parent exists, when the person chooses to go to the parent, then the same window shows that parent's details.

## Terminologies

- Orphaned category: A category whose named parent cannot be found among the loaded definitions; it is not a top-level category, which names no parent at all.

## Journey

**Journey:** Whole ancestry at once

**Before:**

New journey

**After:**

1. Open a category and see where it sits in the whole tree.
2. Jump to any parent in the chain.

## Out of scope

The other tasks of this part of the product have their own stories: See a policy's section, category and support at a glance.
