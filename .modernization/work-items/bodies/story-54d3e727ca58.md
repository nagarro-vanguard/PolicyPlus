# Reopen the last search results without a new search

## Story

As a person using the product, I want the person can come back to the results of the last search without searching again., so that people return to the same hits later and should not wait for another search..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Should reopening start no new search, reselect the earlier choice if it is still listed, and say "No search has been run yet, so there are no results to display." with nothing opening when there are no results? No rule placed in this plan states these behaviours.

## Acceptance criteria

**AC-1: The earlier results are shown again.**
Given a search has been run, when the person opens Search Results, then the earlier results are shown again.

## Out of scope

The other tasks of this part of the product have their own stories: Judge whether a support definition is met by the chosen products; Match policies to the registry key and value terms entered; Show the limit in force and switch it on or off; Find policies by the words you remember; Refuse unusable registry terms and start the search when asked.
