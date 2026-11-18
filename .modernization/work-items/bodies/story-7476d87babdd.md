# Browse products by version and open product details

## Story

As a person using the product, I want a person picks a product, then a major version, then sees the minor versions, and opens product details., so that products form a three-level tree and people filter policies by them..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Describe products and support definitions in their detail views.

## Acceptance criteria

**AC-1: It shows its children ordered by version, with the.**
Given a top-level product is selected, when the major versions list fills, then it shows its children ordered by version, with the heading naming the product; with none selected it is empty and prompts the person to select one.

**AC-2: It shows its children ordered by version, with the.**
Given a major version is selected, when the minor versions list fills, then it shows its children ordered by version, with the heading naming it; with none selected it is empty and prompts for one.

**AC-3: Product details open; with no product selected nothing happens.**
Given a list of products, when the person double-clicks or presses Enter, then product details open; with no product selected nothing happens.

## Terminologies

- Major version: A first-level revision of a product; not a minor version.
- Minor version: A revision beneath a major version.
