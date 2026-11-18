# See a policy's section, category and support at a glance

## Story

As a person using the product, I want opening a policy shows, in one view, the section it applies to, the category it sits in and the support definition it is supported on, with gaps flagged up front. From there the person can go to the category or the support definition it names., so that people see what a policy is, where it sits and what it is supported on without searching, and problems such as an orphaned category or missing support are visible immediately..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- The rules do not say whether the support-details button is enabled or disabled when a policy names no support definition; which should it be?

## Acceptance criteria

**AC-1: The section shows "User or computer".**
Given a policy that applies to both users and computers, when the person opens it, then the section shows "User or computer".

**AC-2: The section shows "Computer"; given one for users only,.**
Given a policy that applies to computers only, when the person opens it, then the section shows "Computer"; given one for users only, then it shows "User".

**AC-3: The category name is shown and the button to.**
Given a policy in a category that exists, when the person opens it, then the category name is shown and the button to open that category's details is enabled.

**AC-4: The category reads "<orphaned from " followed by that.**
Given a policy whose named category does not exist, when the person opens it, then the category reads "<orphaned from " followed by that category code and the category-details button is disabled.

**AC-5: The category reads "<uncategorized>" and the category-details button is.**
Given a policy with no category code, when the person opens it, then the category reads "<uncategorized>" and the category-details button is disabled.

**AC-6: The support definition's name is shown and the support-details.**
Given a policy naming a support definition that exists, when the person opens it, then the support definition's name is shown and the support-details button is enabled.

**AC-7: The support text reads "<missing: " followed by the.**
Given a policy naming a support definition that does not exist, when the person opens it, then the support text reads "<missing: " followed by the code the policy names and the support-details button is disabled.

**AC-8: The support text is blank.**
Given a policy that names no support definition, when the person opens it, then the support text is blank.

**AC-9: The details of that category open.**
Given the policy view with an existing category, when the person chooses the category-details button, then the details of that category open.

**AC-10: The details of that support definition open.**
Given the policy view with an existing support definition, when the person chooses the support-details button, then the details of that support definition open.

## Terminologies

- Orphaned policy: A policy whose named category does not exist in the loaded definitions; it is not the same as an uncategorized policy, which names no category at all.
- Missing support: A policy that names a support definition which is not in the loaded definitions; it is not the same as a policy with no support named.

## Journey

**Journey:** Everything at a glance

**Before:**

New journey

**After:**

1. tasks-browsing-policy-definitions.view-policy-details:everything-at-a-glance#1
2. tasks-browsing-policy-definitions.view-policy-details:everything-at-a-glance#2

## Out of scope

The other tasks of this part of the product have their own stories: Show a category's parent and let people go up to it.
