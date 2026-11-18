# Review what each loaded template file contributes

## Story

As a person using the product, I want a person sees the policy template files loaded in the workspace with a summary of what each one defines, and can open one file to see exactly what it defines., so that so a person can tell which template files are in use and what each adds, without opening every file to find out..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- How does a person open a file's details: by double-clicking it, by pressing Enter on it, or both, and what happens when no file is selected in each case?
- What should the list show for each file (name, folder, namespace, counts of policies, categories, products and support rules)?
- What should the person see when no template file is loaded?
- How does a person get back from a file's details to the list?

## Acceptance criteria

**AC-1: They list only the policies, categories (including sub-categories), products.**
Given a file's details are open, when a person reads them, then they list only the policies, categories (including sub-categories), products (including versions) and support rules that were defined in that file.

## Terminologies

- Loaded template file: A policy template file that has been read into the workspace and whose definitions are in use; not a file that is merely present in a folder.
- File contribution: The policies, categories, products and support rules that one template file defines; not what other loaded files define.

## Out of scope

The other tasks of this part of the product have their own stories: Clear all loaded policy definitions from the workspace; Show a policy's semantic text on request; Add several template files to the loaded policies at once; Choose which policies and categories the tree shows; Read what a category or policy is for; Open an item and offer only the actions that fit it; Review and merge identical user and computer policies; Browse products, their versions and details in one view; Inspect a policy's stored setting and presentation, and copy a line.
