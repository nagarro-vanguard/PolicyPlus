# Review and merge identical user and computer policies

## Story

As a person using the product, I want a person can see which user and computer policies are identical, confirm, and have each identical pair become one policy that applies to both, with the number merged reported back., so that identical settings that appear twice clutter the list; merging them gives one entry per setting without the person losing anything unseen..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- The old program merges at once with no review; the target journey adds a review of the identical pairs and an explicit yes before removal, and a no that changes nothing. Is this confirmed as a new design decision, so it can become criteria?
- Should a person be able to leave some listed pairs out of the merge, or is it all pairs or none?
- What does the message say when no identical pairs are found: "Deduplicated 0 policies." or no merge offered at all?
- After the merge, should the categories and the policy information show the merged policies, and is anything else expected to change on screen?

## Acceptance criteria

**AC-1: They become one policy that applies to both users.**
Given a user policy and a computer policy that are alone in the same category under the same name and have the same explanation text and the same stored-setting location, when the merge runs, then they become one policy that applies to both users and computers.

**AC-2: They are left as they are.**
Given policies with the same name in the same category whose explanation text or stored-setting location differ, when the merge runs, then they are left as they are.

**AC-3: They are left as they are.**
Given two policies with the same name and details that are both for users, or both for computers, when the merge runs, then they are left as they are.

**AC-4: Those policies are left as they are.**
Given a category that holds more than one policy of that name for a section, when the merge runs, then those policies are left as they are.

**AC-5: The policy that comes later in the loaded definitions.**
Given an identical pair, when the merge runs, then the policy that comes later in the loaded definitions is kept and now applies to both users and computers, and the one that comes earlier is removed.

**AC-6: A message states "Deduplicated N policies." with the number.**
Given the merge has finished, when the person reads the result, then a message states "Deduplicated N policies." with the number merged.

## Terminologies

- Identical pair: A user policy and a computer policy that are alone in the same category under the same name, with the same explanation text and the same stored-setting location; not merely similar policies.
- Both-sections policy: A single policy that applies to both users and computers; not a policy of only one section.

## Journey

**Journey:** Review then merge

**Before:**

New journey

**After:**

1. See which user and computer policies are identical.
2. Confirm the merge and see how many policies were merged.

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions from the workspace; Show a policy's semantic text on request; Add several template files to the loaded policies at once; Review what each loaded template file contributes; Choose which policies and categories the tree shows; Read what a category or policy is for; Open an item and offer only the actions that fit it; Browse products, their versions and details in one view; Inspect a policy's stored setting and presentation, and copy a line.
