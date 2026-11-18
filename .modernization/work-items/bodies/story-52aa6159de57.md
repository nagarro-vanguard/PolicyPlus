# Open details of a policy, category, product or support rule

## Story

As a person using the product, I want from a template file's details window, a person opens the details of a policy, category, product or support rule by double-click, and reads how policies relate to categories, support rules and areas., so that it explains where each item sits, including when its category or support rule is unknown..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Describe products and support definitions in their detail views.

## Acceptance criteria

**AC-1: The category name shows and the category button is.**
Given a policy in a category that exists, when its details open, then the category name shows and the category button is enabled; an unknown category shows "<orphaned from " plus the code, none shows "<uncategorized>", and the button is disabled.

**AC-2: Its name shows and the support button is enabled;.**
Given a policy naming a support rule that exists, when its details open, then its name shows and the support button is enabled; if missing it reads "<missing: " plus the code, with no code blank, and the button is disabled.

**AC-3: It names the section: "User or computer", "Computer" or.**
Given a policy, when its details open, then it names the section: "User or computer", "Computer" or "User".

**AC-4: The parent name shows and the button is enabled;.**
Given a category, when its details open, then the parent name shows and the button is enabled; a missing named parent shows "<orphaned from <parent>>" and disables it; a top-level category shows nothing.

**AC-5: The matching details window opens.**
Given a list of policies, categories, products or support rules in file details, when a row is double-clicked, then the matching details window opens.

## Terminologies

- Orphaned: Naming a parent or category that is not loaded; not the same as having none.
