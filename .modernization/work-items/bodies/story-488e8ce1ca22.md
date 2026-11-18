# Save a policy source out as a policy file

## Story

As a person using the product, I want a person names the area, user or computer, and the file to write, and the system writes that area's policy source as a policy file, then says whether it worked., so that administrators can take the settings of one area out of the program as a policy file to keep, move or apply elsewhere, and are told plainly when the file could not be saved..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Read and write policy files byte for byte; Provide an empty scratch source and policy files on the machine.

## Acceptance criteria

**AC-1: The area's policy source is written to that file.**
Given a person has chosen an area and a file to write, when they export, then the area's policy source is written to that file as a policy file.

**AC-2: The person sees "POL exported successfully.".**
Given the policy file was written, when the export finishes, then the person sees "POL exported successfully.".

**AC-3: The person sees "The POL file could not be.**
Given the policy file could not be written, when the export finishes, then the person sees "The POL file could not be saved.".

## Terminologies

- Policy file: A file of policy settings for one area, user or computer, that Group Policy reads.

## Journey

**Journey:** One request

**Before:**

New journey

**After:**

1. tasks-editing-policy-files-directly.export-policy-file:one-request#1

## Out of scope

The other tasks of this part of the product have their own stories: Import a policy file into the user or computer policy source.
