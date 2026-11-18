# Load the policy definitions I last used and recover from trouble

## Story

As a person using the product, I want at start the definitions from my saved folder, or the Windows default folder, are loaded; if there are problems I choose whether to keep a partly loaded set or fall back to the default location., so that the policies I can browse come from the definitions I trust, and a failed load is explained and recoverable..

## Context

This ports behaviour of the existing product, described in the attachment: 5 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Load policy definitions from a folder or...: Definition load coordinator.

## Acceptance criteria

**AC-1: That folder is loaded; given none was saved,.**
Given a definitions folder was saved last time, when the program starts, then that folder is loaded; given none was saved, then the Windows default definitions folder is loaded.

**AC-2: Yes keeps the partly loaded workspace; No counts as.**
Given loading the saved definitions reports problems, when I am asked whether to keep using the workspace, then Yes keeps the partly loaded workspace; No counts as a failed load with the reason "You decided to not use the problematic ADMX bundle.", the partly loaded workspace is thrown away, and what follows is the next two criteria.

**AC-3: Yes saves the Windows default folder as my definitions.**
Given the saved folder is not the Windows default and fails to load, when I am told "Policy definitions could not be loaded from "<folder>": <reason> Load from the default location?" (the reason is the problem found, or the "You decided..." reason after No), then Yes saves the Windows default folder as my definitions folder and No leaves the workspace empty with no further message.

**AC-4: The workspace is replaced by an empty one and.**
Given I chose to load the default location, when it loads, then the workspace is replaced by an empty one and the Windows default folder is loaded into it.

**AC-5: I am told "Policy definitions could not be loaded:.**
Given the Windows default folder itself fails to load (including after I said No to keeping a partly loaded set from it), or fails to load after I chose Yes to the default location, when that happens, then I am told "Policy definitions could not be loaded: <reason>" and the workspace stays empty.

## Terminologies

- Policy definitions: The templates that describe the available policies; not the sources where policy settings are stored.

## Out of scope

The other tasks of this part of the product have their own stories: Tell me once whether the workspace is ready to change; Reopen my last policy sources and show everything on start; Set the language of the policy definition text; Release every open source when the person leaves the program; Show who made Policy Plus and which version is in use.
