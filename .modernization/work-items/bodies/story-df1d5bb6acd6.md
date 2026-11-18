# Leave Policy Plus

## Story

As a person using the product, I want a person chooses Exit and the product ends their use of it; the legacy product also cleaned up the open policy sources at that moment., so that a person can finish their work and know the product is closed..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open policy sources from imported files and describe them.

Open points, to settle before it is built:
- What does Exit do in a web product: close the browser tab, return to a start screen, or something else?
- Unsaved changes to a POL-backed source were lost without warning on leaving in the legacy product; should leaving now warn about them or keep them stored?

## Acceptance criteria

**AC-1: The product's screens end the person's use of it.**
Given the product is open, when the person chooses Exit, then the product's screens end the person's use of it.

**AC-2: The service holds nothing open on their behalf and.**
Given the service reads no folder, hive or Group Policy object of the person's computer, when the person leaves, then the service holds nothing open on their behalf and has no file to release.

## Journey

**Journey:** Leave Policy Plus

**Before:**

New journey

**After:**

1. The person chooses Exit.
2. The product closes.

## Out of scope

The other tasks of this part of the product have their own stories: Start Policy Plus with the last used definitions and sources; Show who made Policy Plus and which version this is; Change the language of policy text and reload.
