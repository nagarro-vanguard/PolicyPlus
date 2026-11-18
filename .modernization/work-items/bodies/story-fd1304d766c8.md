# Import a POL file into the user or computer policies

## Story

As a person using the product, I want the person picks a POL file and an area, and the file's settings are applied to that area's policy file., so that policy files made elsewhere, for example copied from a domain, can be brought into the product..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Apply one policy file's changes to another source; Work out whether a policy is enabled or disabled from its values; Set, delete and forget values and key clearances in a policy file; Show a policy's state and comment per area; Edit entries of a REG file within its source branch; Read and list values in policy files and registry policy keys; Decide whether a policy's support rules are met; Open policy sources from imported files and describe them; Read and write policy files with a byte-faithful round trip; Replace live registry changes with the registry source model; Read and write the stored form of values in a policy file; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Filter policies and keep search results; Refuse operations a REG file source cannot support; Read support rules, products, classes and list options from templates; Keep the browser view consistent after view or edit changes; Export a branch of a policy file as a registry file.

## Acceptance criteria

**AC-1: User and Computer are each usable only when the.**
Given the area choice is shown, when the person looks at it, then User and Computer are each usable only when the task allows that area.

**AC-2: It is applied to that area and the person.**
Given a POL file is chosen by upload and an area is chosen, when it can be read, then it is applied to that area and the person is told "POL import successful." with nothing saved for good until the person saves; when it cannot be read they are told "The POL file could not be loaded." and nothing changes.

## Terminologies

- POL file: A Windows policy file that stores raw registry-style policy settings for one area; not a registry export file.

## Journey

**Journey:** Import a POL file

**Before:**

New journey

**After:**

1. The person chooses Import POL and picks a file to upload.
2. They choose User or Computer.
3. They see whether the import worked.

## Out of scope

The other tasks of this part of the product have their own stories: Export a policy area as a POL file; Open the raw editor on a policy file after a warning; Export a policy area as a registry file from the main screen; Import a registry file from the main screen.
