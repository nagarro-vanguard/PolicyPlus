# Open a loaded template file's details from the file list

## Story

As a person using the product, I want a person opens the details of a template file from the list of loaded files, by double-click or Enter, and sees only what that file defined., so that it shows which policies, categories, products and support rules each file contributes..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Double-clicking with no row selected is unchecked in the legacy program; should it do nothing, like Enter?

## Acceptance criteria

**AC-1: That file's details open without checking a row is.**
Given the loaded files list, when the person double-clicks a row, then that file's details open without checking a row is selected; pressing Enter checks first.

**AC-2: Only policies, categories (with sub-categories), products (with versions) and.**
Given a template file's details, when they open, then only policies, categories (with sub-categories), products (with versions) and support rules defined in that file are listed.

**AC-3: The namespace column fills the width left over.**
Given the window changes size, when it resizes, then the namespace column fills the width left over.

## Terminologies

- Template file: An ADMX file of policy definitions; not the language file with its texts.
