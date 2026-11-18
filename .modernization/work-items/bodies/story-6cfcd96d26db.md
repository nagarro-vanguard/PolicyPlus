# Open an item and offer only the actions that fit it

## Story

As a person using the product, I want a person opens a category as the current one or a policy for the area shown, by pointer, Enter or right-click menu, and the menu offers only the actions that fit the item., so that so the same opening works with and without a pointer and the menu offers only what fits the item..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the policies of the chosen area; Read what a category or policy is for.

Open points, to settle before it is built:
- What should the person see when the menu is requested from the category tree with no category selected? The legacy program fails with an error.

## Acceptance criteria

**AC-1: Nothing happens.**
Given nothing is selected in the policy list, when the person opens an item, then nothing happens.

**AC-2: It becomes the current category.**
Given a category is selected in the policy list, when the person opens it, then it becomes the current category.

**AC-3: Its editor opens for the area currently shown.**
Given a policy is selected in the policy list, when the person opens it, then its editor opens for the area currently shown.

**AC-4: It opens the same way as when opened directly.**
Given an item is selected in the policy list, when the person presses Enter, then it opens the same way as when opened directly.

**AC-5: It becomes the selected category.**
Given a category in the tree, when the person right-clicks it, then it becomes the selected category.

**AC-6: The selection is left as it is.**
Given a category in the tree, when the person left-clicks it, then the selection is left as it is.

**AC-7: It is shown for that category.**
Given the menu is opened from the category tree with a category selected, when it appears, then it is shown for that category.

**AC-8: It is shown for that row.**
Given the menu is opened from anywhere else with a row selected in the policy list, when it appears, then it is shown for that row.

**AC-9: It is not shown.**
Given the menu is opened from anywhere else with no row selected, when the person asks for it, then it is not shown.

**AC-10: Policy-only actions are hidden.**
Given the menu is shown for a category, when its actions are listed, then policy-only actions are hidden.

**AC-11: Category-only actions are hidden.**
Given the menu is shown for a policy, when its actions are listed, then category-only actions are hidden.

## Terminologies

- Item menu: The right-click menu of a category or policy, offering only the actions that fit it; it is not a menu for the whole screen.

## Journey

**Journey:** One place to explore

**Before:**

New journey

**After:**

1. tasks-browsing-policy-definitions.browse-policy-tree:one-place-to-explore#5

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions from the workspace; Show a policy's semantic text on request; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Choose which policies and categories the tree shows; Read what a category or policy is for; Review and merge identical user and computer policies; Browse products, their versions and details in one view; Inspect a policy's stored setting and presentation, and copy a line.
