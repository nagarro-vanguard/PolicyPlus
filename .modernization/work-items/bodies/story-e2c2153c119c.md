# Search every policy and list the hits as they are found

## Story

As a person using the product, I want the results window tests every policy in turn, adds each hit with its category, and refreshes its list and progress as it goes., so that administrators see results early on a long search..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Set, delete and forget values and key clearances in a policy file; Edit entries of a REG file within its source branch; Choose a search result and reopen the results; Read and list values in policy files and registry policy keys; Find policies by title, description or comment text; Find policies by registry key and value; Forget a policy and list the registry values it touches; Replace live registry changes with the registry source model; Report how a search ended and let the person stop it; Read and write the stored form of values in a policy file.

## Acceptance criteria

**AC-1: The search tests every policy in turn and adds.**
Given a search is waiting, when the results window is shown, then the search tests every policy in turn and adds each hit to the list with its category name, in the order policies are held.

**AC-2: The list and progress refresh with "Searching: checked N.**
Given a running search, when 20 more policies are checked, then the list and progress refresh with "Searching: checked N policies so far, found M hits".

**AC-3: The title column fills the list width and drawing.**
Given the results list, when the window is resized or shown, then the title column fills the list width and drawing is smooth.

## Out of scope

The other tasks of this part of the product have their own stories: Report how a search ended and let the person stop it; Choose a search result and reopen the results.
