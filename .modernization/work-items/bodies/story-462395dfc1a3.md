# Import a policy file into the user or computer policy source

## Story

As a person using the product, I want a person chooses a policy file and the source it belongs to, user or computer, and the system loads the file into that source and says whether it worked. The result is held until the person saves., so that people can bring in policy settings someone else prepared, in one request, without losing or leaving behind any setting, and without being surprised about what is already stored..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Read and write policy files byte for byte; Apply one policy file's changes onto another source; Provide an empty scratch source and policy files on the machine.

## Acceptance criteria

**AC-1: Its settings are applied to that source and the.**
Given a readable policy file and a chosen source of user or computer, when the person imports the file, then its settings are applied to that source and the message "POL import successful." is shown.

**AC-2: The message "The POL file could not be loaded.".**
Given a policy file that cannot be read, when the person imports it, then the message "The POL file could not be loaded." is shown and the source is left unchanged.

**AC-3: Nothing has reached disk.**
Given a policy file imported into a source, when the person has not yet saved, then nothing has reached disk.

**AC-4: It is applied in full as if the source.**
Given a whole policy file is imported into a source, when it is applied, then it is applied in full as if the source began empty, so nothing in the file is forgotten.

## Terminologies

- Policy file import: Loading a chosen policy file into the user or computer source, held in memory; it is not saving to disk.
- Held change: A change kept in memory that reaches disk only when the person saves; it is not a stored change.

## Out of scope

The other tasks of this part of the product have their own stories: Save a policy source out as a policy file.
