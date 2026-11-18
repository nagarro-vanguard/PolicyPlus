# Import a registry file from the main screen

## Story

As a person using the product, I want the person chooses an area and imports a registry file into its policy file, and the view refreshes., so that settings from registry files show up as policy states without a separate step..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Import a POL file into the user or computer policies; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Read support rules, products, classes and list options from templates; Keep the browser view consistent after view or edit changes; Open policy sources from imported files and describe them.

## Acceptance criteria

**AC-1: The file is applied to that area's policy file.**
Given the person chooses an area and imports a registry file, when the import succeeds, then the file is applied to that area's policy file and the view is refreshed to show the new policy states.

## Out of scope

The other tasks of this part of the product have their own stories: Import a POL file into the user or computer policies; Export a policy area as a POL file; Open the raw editor on a policy file after a warning; Export a policy area as a registry file from the main screen.
