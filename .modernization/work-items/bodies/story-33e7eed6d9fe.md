# Go to a policy, category, product or support definition by ID

## Story

As a person using the product, I want from the main window a person enters an ID and the product moves to the matching category or policy, or opens the product or support details., so that administrators jump straight to a known item..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Describe products and support definitions in their detail views; Decide whether a policy's support rules are met; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Keep the browser view consistent after view or edit changes; Read support rules, products, classes and list options from templates; Open policy sources from imported files and describe them.

Open points, to settle before it is built:
- Should a policy hidden by the area choice or the filter still leave the category shown with no message, or should the person be told why nothing is selected?

## Acceptance criteria

**AC-1: The category opens, the policy opens in the editor.**
Given an ID is accepted, when it names a visible category, a policy, a product, a support definition or nothing known, then the category opens, the policy opens in the editor with the list moved to it, the product or support details open, or "That object could not be found." is shown; a hidden category shows "The category is not currently visible. Change the view settings and try again."

**AC-2: Its category is shown only when visible in the.**
Given a policy is found, when the list moves to it, then its category is shown only when visible in the tree, the policy row is selected only if listed there, and a policy hidden by the area or the filter leaves the category shown with nothing selected and no message.

**AC-3: The area is the lower-numbered of the area shown.**
Given a policy found by ID, when it opens, then the area is the lower-numbered of the area shown and the area found, so Computer wins over User.

## Journey

**Journey:** Jump to an item by its ID

**Before:**

New journey

**After:**

1. Choose Find by ID from the menu
2. Type the ID and press Go
3. Land on the category, policy editor or details of the item

## Out of scope

The other tasks of this part of the product have their own stories: Turn the filter on and change it from the main window; Start a text or registry search from the main window; Reopen the last search results; Step to the next search result.
