# Change the language of policy text and reload

## Story

As a person using the product, I want a person chooses the language of policy text, the product saves it at once and offers to reload the workspace so the new language applies., so that administrators see policy names and descriptions in the language they work in, without restarting..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Link loaded definitions into categories, products and policies; Work out whether a policy is enabled or disabled from its values; Refuse invalid template files with clear messages; Show a policy's state and comment per area; Read policies, products and options from template files; Read and list values in policy files and registry policy keys; Read settings screen layouts from language files; Detect the Group Policy edition and read optional attributes; Decide whether a policy's support rules are met; Start Policy Plus with the last used definitions and sources; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Validate template and language files while reading them; Read support rules, products, classes and list options from templates; Filter policies and keep search results; Refuse operations a REG file source cannot support; Load policy templates from an uploaded package with the right language; Read and write policy files with a byte-faithful round trip; Open policy sources from imported files and describe them.

## Acceptance criteria

**AC-1: The code is saved at once in the shared.**
Given the person confirmed a new language code, when it is accepted, then the code is saved at once in the shared stored settings and the person is asked "Language changes will take effect when ADML files are next loaded. Would you like to reload the workspace now?"; Yes empties the workspace and reloads the saved definitions package in that language.

## Journey

**Journey:** Switch policy text language

**Before:**

New journey

**After:**

1. The person opens the language choice from the menu.
2. The person enters a language code and confirms.
3. The product saves it and asks whether to reload the workspace.
4. The person chooses Yes and sees the policies in the new language.

## Out of scope

The other tasks of this part of the product have their own stories: Start Policy Plus with the last used definitions and sources; Show who made Policy Plus and which version this is; Leave Policy Plus.
