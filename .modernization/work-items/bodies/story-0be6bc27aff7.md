# Choose which policies and categories the tree shows

## Story

As a person using the product, I want a person narrows the loaded definitions to user policies, computer policies or both, and chooses whether categories with no visible policies are shown., so that so they see only the part of the definitions they want to read..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Which area is shown when the person first opens the definitions?
- Which category is current when the person first opens the definitions?
- Are empty categories shown or hidden when the person first opens the definitions?
- Does the area choice also apply to the policies listed beside the tree, or only to the tree itself?

## Acceptance criteria

**AC-1: Only user policies are shown.**
Given the definitions are loaded, when the person chooses User as the area, then only user policies are shown.

**AC-2: Only computer policies are shown.**
Given the definitions are loaded, when the person chooses Computer as the area, then only computer policies are shown.

**AC-3: User and computer policies are shown together.**
Given the person has chosen User or Computer, when they choose any other area choice, then user and computer policies are shown together.

**AC-4: Categories with no visible policies appear in the tree.**
Given empty categories are hidden, when the person switches empty categories on from the Empty Categories menu, then categories with no visible policies appear in the tree.

**AC-5: They leave the tree and the view moves to.**
Given empty categories are shown, when the person switches them off from the Empty Categories menu, then they leave the tree and the view moves to the nearest visible category.

## Terminologies

- Area: The part of the policies being read: user policies, computer policies or both; it is not the place a policy is saved.
- Empty category: A category that holds no visible policy and no visible subcategory; it is not a category with no policies at all.

## Journey

**Journey:** One place to explore

**Before:**

New journey

**After:**

1. tasks-browsing-policy-definitions.browse-policy-tree:one-place-to-explore#1
2. tasks-browsing-policy-definitions.browse-policy-tree:one-place-to-explore#2

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions from the workspace; Show a policy's semantic text on request; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Read what a category or policy is for; Open an item and offer only the actions that fit it; Review and merge identical user and computer policies; Browse products, their versions and details in one view; Inspect a policy's stored setting and presentation, and copy a line.
