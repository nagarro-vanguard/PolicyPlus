# Choose which categories and areas the list shows

## Story

As a person using the product, I want a person switches empty categories on or off and chooses to see user policies, computer policies or both., so that people work on one area at a time and need to hide clutter..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Read support rules, products, classes and list options from templates; Keep the browser view consistent after view or edit changes; Open policy sources from imported files and describe them.

## Acceptance criteria

**AC-1: Empty categories are shown or hidden and the view.**
Given the "Empty Categories" menu, when the person switches it, then empty categories are shown or hidden and the view moves to the nearest visible category.

**AC-2: User policies show; "Computer" shows computer policies; any other.**
Given the area choice, when the person picks "User", then user policies show; "Computer" shows computer policies; any other choice shows both.

## Terminologies

- Area: The section a policy applies to, user or computer; it is not a category.

## Out of scope

The other tasks of this part of the product have their own stories: Load policy definitions from a folder or a single file; Browse categories and policies and read their descriptions; Merge identical user and computer policy pairs; Open the lists of loaded files, support rules and products; Use the right-click menu on categories and policies.
