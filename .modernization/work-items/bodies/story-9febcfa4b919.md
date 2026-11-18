# Turn the filter on and change it from the main window

## Story

As a person using the product, I want from the main window a person opens the filter dialog, which turns "Only Filtered Policies" on when changed, and switches the filter on or off with that menu entry., so that administrators can narrow the policy lists and widen them again at will..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open, reset or cancel the filter dialog; Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Read support rules, products, classes and list options from templates; Keep the browser view consistent after view or edit changes; Open policy sources from imported files and describe them.

## Acceptance criteria

**AC-1: "Only Filtered Policies" turns on and the view moves.**
Given the filter dialog is accepted, when the filter options change, then "Only Filtered Policies" turns on and the view moves to the nearest visible category.

**AC-2: The filter switches on or off and the view.**
Given the main window, when a person chooses "Only Filtered Policies", then the filter switches on or off and the view moves to the nearest visible category.

## Journey

**Journey:** Narrow the list with a filter

**Before:**

New journey

**After:**

1. Open the filter options from the menu
2. Choose conditions and press OK
3. See only the filtered policies and the nearest visible category
4. Switch Only Filtered Policies off to see everything again

## Out of scope

The other tasks of this part of the product have their own stories: Go to a policy, category, product or support definition by ID; Start a text or registry search from the main window; Reopen the last search results; Step to the next search result.
