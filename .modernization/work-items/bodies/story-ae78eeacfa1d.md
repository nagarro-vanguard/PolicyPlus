# Open products and nested rules from support rule details

## Story

As a person using the product, I want a person opens a product or a nested support rule from the entries in support rule details., so that it lets people follow which products a rule matches..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Describe products and support definitions in their detail views.

## Acceptance criteria

**AC-1: A product entry opens product details and a nested.**
Given support rule entries, when one is double-clicked, then a product entry opens product details and a nested support rule shows in the same window; a missing product or no selection does nothing.

**AC-2: The Name column fills the list beside the version.**
Given the window resizes, when the list changes size, then the Name column fills the list beside the version columns.
