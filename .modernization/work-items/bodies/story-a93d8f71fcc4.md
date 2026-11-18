# Inspect and copy a SPOL fragment

## Story

As a person using the product, I want a person sees the SPOL text of a fragment, can show or hide the header line, select all and copy it., so that administrators move single settings between machines by copying their SPOL text..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the SPOL fragment with an optional header.

## Acceptance criteria

**AC-1: The text is focused and fully selected.**
Given the fragment window opens, when it is shown, then the text is focused and fully selected.

**AC-2: The text starts with the heading and a blank.**
Given Include SPOL header, when ticked, then the text starts with the heading and a blank line; otherwise only the fragment shows.

**AC-3: All text is selected.**
Given the text box, when Ctrl+A is pressed, then all text is selected.

**AC-4: The whole text is selected and copied to the.**
Given the text, when Copy is pressed, then the whole text is selected and copied to the clipboard.
