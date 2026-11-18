# Cancel the registry import with Escape

## Story

As a person using the product, I want pressing Escape in the registry import window closes it as cancelled., so that a person can leave without importing..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: It closes as cancelled and nothing is imported.**
Given the import window is open, when the person presses Escape, then it closes as cancelled and nothing is imported.

## Out of scope

The other tasks of this part of the product have their own stories: Choose a registry file to import and guess its prefix; Import a registry file into a policy file.
