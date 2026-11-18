# Watch search hits arrive and stop the search when enough is found

## Story

As a person using the product, I want while a search runs, the person sees each matching policy appear in the results with its category, sees progress as it goes, can stop the search or leave, and is told how the search ended., so that review can begin at the first hit instead of after the whole search, and the person always knows whether the results are complete..

## Context

This ports behaviour of the existing product, described in the attachment: 5 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show each policy's state and comment and apply the filters; Offer the area choice and reopen the last search results.

## Acceptance criteria

**AC-1: The results are cleared, the progress range matches the.**
Given earlier results exist, when a new search starts, then the results are cleared, the progress range matches the number of policies and the status reads "Starting search".

**AC-2: Every policy is tested in turn and each hit.**
Given a search is running, when it tests the policies, then every policy is tested in turn and each hit is added to the list with its category name, in the order policies are held.

**AC-3: The list and progress are refreshed and the status.**
Given a search is running, when every 20 policies have been checked, then the list and progress are refreshed and the status reads "Searching: checked N policies so far, found M hits".

**AC-4: The search is cancelled; closing before it finished leaves.**
Given a search is running, when the person presses Stop or closes the results window, then the search is cancelled; closing before it finished leaves the status at "Search canceled" with the progress bar full.

**AC-5: The status reads "Finished searching: checked N policies, found.**
Given a search ends, when it ends, then the status reads "Finished searching: checked N policies, found M hits", or a "Search canceled" message if it was stopped, and the Stop button is disabled.

## Terminologies

- Search hit: A policy that matches the search, shown in the results with its category; not every policy that was checked.

## Journey

**Journey:** Results as they arrive

**Before:**

New journey

**After:**

1. Watch the policies that match appear as the search goes.
2. Stop the search once enough has been found, or leave it.
3. Know how the search ended.

## Out of scope

The other tasks of this part of the product have their own stories: Pick a search hit to open and step to the next hit.
