# Browse categories and policies and read their descriptions

## Story

As a person using the product, I want a person selects a category in the tree, sees its subcategories and policies in the list, highlights an item to read its description, and opens it by double-click or Enter., so that this is the main way to find a policy among thousands..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Read support rules, products, classes and list options from templates; Open policy sources from imported files and describe them; Keep the browser view consistent after view or edit changes.

## Acceptance criteria

**AC-1: It becomes the current category, any selected policy is.**
Given a category in the tree, when the person selects it, then it becomes the current category, any selected policy is cleared, and its subcategories, policies and description are shown.

**AC-2: It becomes the selected policy and any highlighted category.**
Given the policy list, when the person highlights a policy, then it becomes the selected policy and any highlighted category is cleared; highlighting a category does the reverse and highlighting nothing clears both; the description follows the highlight.

**AC-3: With no selection nothing happens, a category opens as.**
Given the policy list, when the person double-clicks or presses Enter, then with no selection nothing happens, a category opens as the current category, and a policy opens its editor for the area currently shown.

**AC-4: The name column fills the list and the description.**
Given the window or panes are resized, when the policy name column and the description pane resize, then the name column fills the list and the description labels fit the pane width with no horizontal scroll bar.

## Terminologies

- Current category: The category whose contents fill the list; it is not the highlighted row.
- Selected policy: The policy last highlighted in the list; it is not the policy being edited.

## Journey

**Journey:** Browse policies

**Before:**

New journey

**After:**

1. Pick a category in the tree
2. Scan its subcategories and policies in the list
3. Highlight an item to read its description
4. Open a category or a policy

## Out of scope

The other tasks of this part of the product have their own stories: Load policy definitions from a folder or a single file; Choose which categories and areas the list shows; Merge identical user and computer policy pairs; Open the lists of loaded files, support rules and products; Use the right-click menu on categories and policies.
