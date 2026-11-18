# Refuse unusable registry searches and cancel with Escape

## Story

As a person using the product, I want find by registry refuses empty terms and terms that name a root key, and closes as cancelled on Escape., so that people are told how to fix their terms..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: The search is refused with "Please enter search terms.".**
Given both key and value are empty, when Search is pressed, then the search is refused with "Please enter search terms."

**AC-2: It is refused with "Policies' root keys are determined.**
Given key text starts with a root key name for the local machine or the current user, short or full, followed by a backslash, when Search is pressed, then it is refused with "Policies' root keys are determined only by their section. Remove the root key from the search terms and try again."

**AC-3: It closes as cancelled.**
Given Find by registry is open, when Escape is pressed, then it closes as cancelled.

## Out of scope

The other tasks of this part of the product have their own stories: Find policies by registry key and value.
