# Open the raw editor on a policy file after a warning

## Story

As a person using the product, I want from the main screen the person opens the raw editor on a policy file, after accepting a caution the first time., so that raw editing can leave policies inconsistent, so the person must knowingly accept the risk, and only a policy file that can be edited directly is offered..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Work out whether a policy is enabled or disabled from its values; Show a policy's state and comment per area; Import a POL file into the user or computer policies; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; See and select the keys and values of a policy file; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Read support rules, products, classes and list options from templates; Keep the browser view consistent after view or edit changes; Open policy sources from imported files and describe them.

Open points, to settle before it is built:
- Where is the acceptance of the caution remembered in the web product: per browser, or in the shared settings?

## Acceptance criteria

**AC-1: They are told "Neither loaded source is backed by.**
Given neither area is backed by an uploaded policy file, when the person chooses to edit the raw policy file, then they are told "Neither loaded source is backed by a POL file."; the area they may choose is limited to areas backed by a policy file.

**AC-2: They must accept "Caution! This tool is for very.**
Given the person has never accepted the caution, when they open the raw editor, then they must accept "Caution! This tool is for very advanced users. Improper modifications may result in inconsistencies in policies' states."; Yes continues and records the acceptance, and No cancels and asks again next time.

## Out of scope

The other tasks of this part of the product have their own stories: Import a POL file into the user or computer policies; Export a policy area as a POL file; Export a policy area as a registry file from the main screen; Import a registry file from the main screen.
