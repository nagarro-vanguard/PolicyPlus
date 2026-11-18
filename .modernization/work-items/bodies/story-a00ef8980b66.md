# Use the right-click menu on categories and policies

## Story

As a person using the product, I want a person right-clicks a category or policy and picks an action that applies to it., so that the menu gives quick access to opening, editing, details and inspection..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Inspect a policy's definition and its semantic policy text; Show the category tree and the list of a chosen category; Link loaded definitions into categories, products and policies; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Read a policy's saved state from its stored values; Open details of a policy, category, product or support rule; Decide whether a policy's support rules are met; Show the SPOL fragment with an optional header; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Keep the browser view consistent after view or edit changes; Read support rules, products, classes and list options from templates; Open policy sources from imported files and describe them.

Open points, to settle before it is built:
- The legacy program fails with an error when the menu opens from the category tree with no selected category; what should the person see instead?

## Acceptance criteria

**AC-1: It shows only actions that fit: policy-only actions are.**
Given a right-click, when the menu opens, then it shows only actions that fit: policy-only actions are hidden for a category and category-only actions for a policy.

**AC-2: Given the menu opens from the category tree it.**
Given the menu opens from the category tree it applies to the selected category; from elsewhere with a policy-list row selected it applies to that row; from elsewhere with no row selected it is not shown.

**AC-3: It becomes the selected category; a left-click is left.**
Given a category in the tree is right-clicked, when the menu opens, then it becomes the selected category; a left-click is left as is.

**AC-4: The category, edit window, details window or inspection window.**
Given the menu is open, when the person chooses an item, then the category, edit window, details window or inspection window opens for the chosen object.

## Out of scope

The other tasks of this part of the product have their own stories: Load policy definitions from a folder or a single file; Browse categories and policies and read their descriptions; Choose which categories and areas the list shows; Merge identical user and computer policy pairs; Open the lists of loaded files, support rules and products.
