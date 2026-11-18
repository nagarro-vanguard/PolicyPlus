# Open the chosen policy sources

## Story

As a person using the product, I want from the main screen, the person opens the policy sources dialog and, once accepted, the program opens the chosen user and computer sources and shows the result., so that the person works on the policies of the source they chose, and sees at once whether it can be changed..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Open policy sources from imported files and describe them; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Read and list values in policy files and registry policy keys; Detect the Group Policy edition and read optional attributes; Keep policy comments with their source and read comment files; Decide whether a policy's support rules are met; Read and write policy files with a byte-faithful round trip; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Resolve where each policy source comes from and whether it can be saved; Read and write the stored form of values in a policy file; Open policy sources, load their comments and report the result; Read support rules, products, classes and list options from templates; Keep the browser view consistent after view or edit changes; Replace live registry changes with the registry source model.

## Acceptance criteria

**AC-1: The opening result is shown and the view moves.**
Given the person accepted the policy sources dialog, when the sources are opened, then the opening result is shown and the view moves to the nearest visible category. Sources come from uploaded files and imports; the live system source is not offered.

## Journey

**Journey:** Open policy sources

**Before:**

New journey

**After:**

1. Choose the open policy resources command
2. Choose the sources in the dialog
3. See the result of opening
4. Continue in the nearest visible category

## Out of scope

The other tasks of this part of the product have their own stories: Save policy changes to their sources.
