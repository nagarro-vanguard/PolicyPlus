# Find each template and its text in the perso...: Template folder scanner

## Story

As a person using the product, I want when downloaded definitions are to be used, find the template files in the chosen folder and, for each one, pick the language text that goes with it and read it, refusing flawed language text., so that a person gets definitions whose names and descriptions read in their own language, and a missing or flawed language is named instead of failing vaguely..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: Only files directly in the folder whose names end.**
Given a chosen folder holding template files in any letter case, subfolders and other files, when the definitions are scanned, then only files directly in the folder whose names end in .admx are taken as templates and the rest is ignored.

## Terminologies

- Template: A definition file describing policies, categories and products; not the language text that names them.
- Language text: The file holding the names, descriptions and screen layouts of a template in one language; not the template itself.

## Journey

**Journey:** Check, then switch

**Before:**

New journey

**After:**

1. Say that the downloaded definitions should become the ones in use
2. Be sure each template comes with its text in my language

## Out of scope

The other tasks of this part of the product have their own stories: Find each template and its text in the person'...: Language file locator; Check every template is sound before using it; Work out categories, products, policies...: Definition structure builder; Offer the missing policy definitions once on first use; Switch to the new definitions in one step; Show each policy's state and comment and apply the filters.
