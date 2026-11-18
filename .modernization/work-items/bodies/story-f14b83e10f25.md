# Find each template and its text in the person'...: Language file locator

## Story

As a person using the product, I want when downloaded definitions are to be used, find the template files in the chosen folder and, for each one, pick the language text that goes with it and read it, refusing flawed language text., so that a person gets definitions whose names and descriptions read in their own language, and a missing or flawed language is named instead of failing vaguely..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: That code is used; given none is saved,.**
Given a saved language code, when language text is needed, then that code is used; given none is saved, then the computer's own language is used.

**AC-2: The subfolder named exactly by the language code is.**
Given a template and several language subfolders, when its language text is chosen, then the subfolder named exactly by the language code is used if it holds this template's file, else the first subfolder of the same language family (compared with capital letters mattering) that holds it, else en-US; a folder lacking the file is skipped.

**AC-3: It is refused with "The corresponding ADML is missing".**
Given no language file is found in any of those places, when the template is read, then it is refused with "The corresponding ADML is missing" and none of its content is loaded.

## Journey

**Journey:** Check, then switch

**Before:**

New journey

**After:**

1. Say that the downloaded definitions should become the ones in use
2. Be sure each template comes with its text in my language

## Out of scope

The other tasks of this part of the product have their own stories: Find each template and its text in the perso...: Template folder scanner; Check every template is sound before using it; Work out categories, products, policies...: Definition structure builder; Offer the missing policy definitions once on first use; Switch to the new definitions in one step; Show each policy's state and comment and apply the filters.
