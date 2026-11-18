# Choose a search result and reopen the results

## Story

As a person using the product, I want go or a double-click takes the selected result, and reopening the window selects the earlier result again., so that people continue from where they left off..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: The window accepts, passes the policy back and remembers.**
Given a result is selected, when Go or a double-click is used, then the window accepts, passes the policy back and remembers its position; with none selected it does not accept.

**AC-2: It is selected again.**
Given the window is reopened, when the earlier selected result is still listed, then it is selected again.

## Terminologies

- Search results: The policies a search found, kept so the person can return to them; it is not the filter.

## Out of scope

The other tasks of this part of the product have their own stories: Search every policy and list the hits as they are found; Report how a search ended and let the person stop it.
