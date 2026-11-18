# Open the chosen policy sources and keep the view on a visible category

## Story

As a person using the product, I want when the person confirms, both sources are created from their choices and opened, the result of opening is shown, and the view moves to the nearest category that is visible. The same keeping of the view on a visible category applies whenever a view setting changes: the selection that is no longer shown is dropped and the tree and list are rebuilt. If either source cannot be created, the person is told which side failed and why, and the dialog stays open., so that so the person starts working against exactly the policies they chose, learns at once, with the reason, when a choice cannot be used, and is never left looking at a category or policy that is no longer shown..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open the user and computer sources and remember them.

## Acceptance criteria

**AC-1: The user source is created from it (local files,.**
Given the person has chosen a kind for the user side, when they confirm, then the user source is created from it (local files, registry path, policy file, a user's own policy by identifier, a user profile file, or scratch space when nothing else is selected); and if it cannot be created they see "The user policy loader could not be created." followed by the reason and the dialog stays open.

**AC-2: The computer source is created from it (local files,.**
Given the person has chosen a kind for the computer side, when they confirm, then the computer source is created from it (local files, registry path, policy file name, or scratch space when nothing else is selected); and if it cannot be created they see "The computer policy loader could not be created." followed by the reason and the dialog stays open.

**AC-3: The dialog closes as accepted, the sources are opened,.**
Given both sources were created, when the person confirms, then the dialog closes as accepted, the sources are opened, the opening result is shown and the view moves to the nearest visible category.

**AC-4: It moves up to the nearest visible category, drops.**
Given the person changes a view setting, when the view is refreshed, then it moves up to the nearest visible category, drops the selected policy if the move happened or the policy is now hidden, rebuilds the tree and list, and a policy kept appears in the information pane only, with its row not highlighted.

## Journey

**Journey:** Say where each side lives

**Before:**

New journey

**After:**

1. tasks-choosing-and-saving-policy-sources.choose-policy-sources:say-where-each-side-lives#4

## Out of scope

The other tasks of this part of the product have their own stories: Save policy changes to every chosen source in one request.
