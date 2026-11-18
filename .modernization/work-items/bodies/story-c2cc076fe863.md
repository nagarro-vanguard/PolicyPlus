# Open the lists of loaded files, support rules and products

## Story

As a person using the product, I want a person opens the list of loaded template files, of all support rules, or of all products., so that people need to see what is loaded to understand what policies they can browse..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Filter the support rules list and open support rule details.

## Acceptance criteria

**AC-1: The template files in the workspace are listed.**
Given loaded definitions, when the person chooses the loaded files list, then the template files in the workspace are listed.

**AC-2: Every support rule is listed.**
Given loaded definitions, when the person chooses all support rules, then every support rule is listed.

**AC-3: The top-level products are listed ordered by name, each.**
Given loaded definitions, when the person chooses all products, then the top-level products are listed ordered by name, each with its number of children.

## Out of scope

The other tasks of this part of the product have their own stories: Load policy definitions from a folder or a single file; Browse categories and policies and read their descriptions; Choose which categories and areas the list shows; Merge identical user and computer policy pairs; Use the right-click menu on categories and policies.
