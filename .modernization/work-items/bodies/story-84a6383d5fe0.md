# Switch the limit on or off and move to the nearest shown category

## Story

As a person using the product, I want when a person changes the limit it is turned on, and the person can switch it on or off at any time without losing it; the view moves to the nearest category still shown., so that people never end up looking at a category the limit has emptied, and they can compare the full list with the narrowed one in one action..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show each policy's state and comment and apply the filters; Open the chosen policy sources and move to a visible category.

## Acceptance criteria

**AC-1: Only Filtered Policies turns on and the view moves.**
Given the limit is off, when a person changes any choice of the limit, then Only Filtered Policies turns on and the view moves to the nearest visible category.

**AC-2: The limit is applied or lifted without being lost.**
Given the limit has been set, when a person switches Only Filtered Policies on or off, then the limit is applied or lifted without being lost and the view moves to the nearest visible category.

## Terminologies

- Only Filtered Policies: The switch that applies or lifts the limit on the policy list; it is not the limit's contents.

## Out of scope

The other tasks of this part of the product have their own stories: Judge whether a support definition is met for chosen products; Match policies to the registry key and value terms entered; Reopen the last search results without a new search; Show the limit in force when choosing how to narrow the list; Find policies by the words you remember; Split one pasted line into registry key and value as the person types.
