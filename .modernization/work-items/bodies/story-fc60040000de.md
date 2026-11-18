# Read what a category or policy is for

## Story

As a person using the product, I want a person moves to a category or points at a policy or category and sees its contents and a description of what it is for, with one focus at a time., so that so they can move through the loaded definitions and understand each item without opening it..

## Context

This ports behaviour of the existing product, described in the attachment: 6 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the policies of the chosen area.

Open points, to settle before it is built:
- Is a policy's description shown as soon as the policy is highlighted?

## Acceptance criteria

**AC-1: It becomes the current category and no policy stays.**
Given the tree is shown, when the person selects a category, then it becomes the current category and no policy stays selected.

**AC-2: An Up row marked Parent that names the parent.**
Given a category is chosen, when its contents are listed, then an Up row marked Parent that names the parent comes first when the category has a parent, then visible subcategories by name, then visible policies by name.

**AC-3: Each policy row shows its state and its comment.**
Given a category is chosen, when its policies are listed, then each policy row shows its state and its comment text.

**AC-4: It carries the category title, the line saying how.**
Given a category is selected or highlighted, when its description is shown, then it carries the category title, the line saying how many policies and subcategories it contains, and its explanation.

**AC-5: The contents line says "The selected category" and the.**
Given a category is highlighted but not opened, when its description is shown, then the contents line says "The selected category" and the counts include every policy and subcategory, hidden or not.

**AC-6: It carries the policy title, either "Requirements:" with the.**
Given a policy is selected, when its description is shown, then it carries the policy title, either "Requirements:" with the support name or "(no requirements information)", and its explanation.

**AC-7: A notice says so; for any other policy no.**
Given a policy is a preference, when its description is shown, then a notice says so; for any other policy no such notice appears.

**AC-8: A preference gets the preference icon, otherwise one with.**
Given a policy is listed, when its icon is chosen, then a preference gets the preference icon, otherwise one with no configurable elements gets the plain icon, otherwise it gets the extra configuration icon.

**AC-9: It becomes the selected policy and any highlighted category.**
Given the person highlights a policy, when it is highlighted, then it becomes the selected policy and any highlighted category is cleared.

**AC-10: Any selected policy is cleared and the category is.**
Given the person highlights a category, when it is highlighted, then any selected policy is cleared and the category is the one highlighted.

**AC-11: No policy and no category is highlighted.**
Given the person highlights nothing, when the highlight updates, then no policy and no category is highlighted.

**AC-12: The title and support lines are hidden and the.**
Given nothing is selected, when the description pane is shown, then the title and support lines are hidden and the pane reads "Select an item to see its description."

## Terminologies

- Focus: The single category or policy whose description is shown; it is not a record of both a highlighted policy and a highlighted category.
- Parent row: The first row of a category's contents, marked Parent, that leads up to the category above it.

## Journey

**Journey:** One place to explore

**Before:**

New journey

**After:**

1. tasks-browsing-policy-definitions.browse-policy-tree:one-place-to-explore#3
2. tasks-browsing-policy-definitions.browse-policy-tree:one-place-to-explore#4

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions from the workspace; Show a policy's semantic text on request; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Choose which policies and categories the tree shows; Open an item and offer only the actions that fit it; Review and merge identical user and computer policies; Browse products, their versions and details in one view; Inspect a policy's stored setting and presentation, and copy a line.
