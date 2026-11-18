# Walk a product's versions and parent in product details

## Story

As a person using the product, I want a person opens a child revision or the parent product in the product details window., so that it lets people move through a product's versions..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Describe products and support definitions in their detail views.

## Acceptance criteria

**AC-1: It shows in the same window; with nothing selected.**
Given product details with child revisions, when a child is double-clicked, then it shows in the same window; with nothing selected nothing happens.

**AC-2: The parent shows in the same window.**
Given product details with a parent, when the person presses the parent button, then the parent shows in the same window.

**AC-3: The Name column fills the list beside Version.**
Given the window resizes, when the list changes size, then the Name column fills the list beside Version.
