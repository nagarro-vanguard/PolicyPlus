# Filter the support rules list and open support rule details

## Story

As a person using the product, I want a person types text to narrow the support rules and opens the details of one, by double-click or Enter., so that there are many support rules and people look one up by name..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Describe products and support definitions in their detail views.

Open points, to settle before it is built:
- Double-clicking with no row selected is unchecked in the legacy program; should it do nothing, like Enter?

## Acceptance criteria

**AC-1: Its details open without checking a row is selected;.**
Given the support rules list, when the person double-clicks a row, then its details open without checking a row is selected; Enter checks first.

**AC-2: Only names containing it, ignoring case, show; an empty.**
Given typed filter text, when the list updates, then only names containing it, ignoring case, show; an empty filter shows all; entries are ordered by name ignoring leading spaces and shown without them.

## Terminologies

- Support rule: A named condition listing the products a policy runs on; not a policy.
