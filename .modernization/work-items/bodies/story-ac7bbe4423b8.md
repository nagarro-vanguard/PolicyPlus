# Start a text or registry search from the main window

## Story

As a person using the product, I want the main window starts a search from the text or registry dialog's terms, clears earlier results and opens the picked policy., so that administrators move from a search to the policy in one flow..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; Reopen the last search results; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Go to a policy, category, product or support definition by ID; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Keep the browser view consistent after view or edit changes; Read support rules, products, classes and list options from templates; Open policy sources from imported files and describe them.

## Acceptance criteria

**AC-1: A search starts with them and can search both.**
Given Find by text, when terms are entered, then a search starts with them and can search both areas' comments.

**AC-2: A search starts with them.**
Given Find by registry, when terms are entered, then a search starts with them.

**AC-3: Earlier results are cleared, the progress range is the.**
Given a search starts, then earlier results are cleared, the progress range is the number of policies and it begins on "Starting search".

**AC-4: Its editor opens in the current area and the.**
Given a search dialog opens empty or runs a new search, when a result is picked, then its editor opens in the current area and the list moves to that policy.

## Journey

**Journey:** Search for a policy

**Before:**

New journey

**After:**

1. Choose Find by text or by registry
2. Enter terms and press Search
3. Watch results appear
4. Pick a result and edit the policy

## Out of scope

The other tasks of this part of the product have their own stories: Turn the filter on and change it from the main window; Go to a policy, category, product or support definition by ID; Reopen the last search results; Step to the next search result.
