# Export a branch of a policy file as a registry file

## Story

As a person using the product, I want the person writes the chosen branch of the policy file out as a registry file., so that registry files can be reviewed, shared, and imported on machines that use the built-in registry editor..

## Context

This ports behaviour of the existing product, described in the attachment: 6 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Apply one policy file's changes to another source; Set, delete and forget values and key clearances in a policy file; Edit entries of a REG file within its source branch; Read and list values in policy files and registry policy keys; Open policy sources from imported files and describe them; Replace live registry changes with the registry source model; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip.

## Acceptance criteria

**AC-1: They are told "Please specify a filename and path.**
Given no file name was given, when the person presses Export, then they are told "Please specify a filename and path for the exported REG." and nothing is written.

**AC-2: The whole file is applied as the difference from.**
Given the policy file is applied to the export, when the export is built, then the whole file is applied as the difference from an empty file, so nothing is forgotten.

**AC-3: The trailing backslash is removed before the branch is.**
Given a source branch ends with a backslash, when the export is built, then the trailing backslash is removed before the branch is used.

**AC-4: A removed key is written with a leading minus.**
Given keys are marked for removal and values for deletion, when the registry file is written, then a removed key is written with a leading minus sign and a deleted value as a bare minus sign.

**AC-5: A default value is shown as an at sign,.**
Given values of every kind, when the registry file is written, then a default value is shown as an at sign, quotes and backslashes in names and text are escaped, text is quoted, a 32-bit number is "dword:" with eight hexadecimal digits, and every other kind including 64-bit numbers, expandable text and multiple strings is written as hex bytes with its type number as hex(n), except plain binary which is hex; lines wrap before column 78 with a trailing backslash.

**AC-6: The person is told "REG exported successfully." and the.**
Given the file is written, when the export succeeds, then the person is told "REG exported successfully." and the window closes; on any failure they are told only "Failed to export REG!" and the window stays open.

## Terminologies

- Registry file: A text file of registry keys and values that Windows can import; not a policy file.

## Out of scope

The other tasks of this part of the product have their own stories: Choose the file for a registry export.
