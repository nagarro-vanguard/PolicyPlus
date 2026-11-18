# Import a registry file into a policy file

## Story

As a person using the product, I want the person loads a registry file with its prefix and applies it to the policy file., so that settings exported from another machine or tool can be brought into the policy file in one step..

## Context

This ports behaviour of the existing product, described in the attachment: 9 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Set, delete and forget values and key clearances in a policy file; Read and list values in policy files and registry policy keys; Edit entries of a REG file within its source branch; Open policy sources from imported files and describe them; Replace live registry changes with the registry source model; Read and write the stored form of values in a policy file; Read and write policy files with a byte-faithful round trip.

Open points, to settle before it is built:
- What should happen when a key does not start with the prefix: should the web product apply the full original name as the old program did, or refuse it?
- What should the person see for data in an unrecognised form: an empty value written, or a refusal?

## Acceptance criteria

**AC-1: They are told "Please specify a REG file to.**
Given no file is named, when the person presses Import, then they are told "Please specify a REG file to import." and nothing is imported; with no prefix they are told "Please specify the prefix used to fully qualify paths in the REG file."

**AC-2: It is refused with "Incorrect REG signature".**
Given the first line is not "Windows Registry Editor Version 5.00", when the file is read, then it is refused with "Incorrect REG signature".

**AC-3: They are ignored.**
Given blank lines and lines starting with a semicolon, when the file is read, then they are ignored.

**AC-4: The whole key is marked for removal; otherwise it.**
Given a key header, when it starts with a minus sign, then the whole key is marked for removal; otherwise it opens a key whose values follow.

**AC-5: It is the key's default value with an empty.**
Given a value line starting with an at sign, when the file is read, then it is the key's default value with an empty name.

**AC-6: A bare minus sign is a value to delete,.**
Given value data, when it is read, then a bare minus sign is a value to delete, quoted data is text, "dword:" is a 32-bit number in hexadecimal, and "hex" is bytes typed by the number in brackets or binary if none; data in none of these forms is kept as a value with no data and no type, with no error.

**AC-7: The prefix is removed; a key not starting with.**
Given a key name, when it starts with the prefix regardless of case, then the prefix is removed; a key not starting with it keeps its full original name.

**AC-8: A key marked for removal is cleared, a value.**
Given the file is read, when it is applied, then a key marked for removal is cleared, a value marked for deletion is deleted, any other value is saved, and the source branch limit is not checked.

**AC-9: The policy file holds the imported entries; on any.**
Given the file is loaded and applied straight to the chosen policy file, when it succeeds, then the policy file holds the imported entries; on any failure the person is told only "Failed to import the REG file."

## Out of scope

The other tasks of this part of the product have their own stories: Choose a registry file to import and guess its prefix; Cancel the registry import with Escape.
