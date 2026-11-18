# Choose a registry file to import and guess its prefix

## Story

As a person using the product, I want the person picks a registry file, and the program guesses the key prefix from it and warns about default values., so that registry files name keys in full, and the program must know how much of the name to strip to place them in a policy file..

## Context

This ports behaviour of the existing product, described in the attachment: 5 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Import a registry file into a policy file; Read and write policy files with a byte-faithful round trip.

## Acceptance criteria

**AC-1: Only files of type *.reg are offered; in the.**
Given the person browses for a registry file, when the chooser opens, then only files of type *.reg are offered; in the web product the file is uploaded.

**AC-2: The prefix is guessed from it, and if the.**
Given a file is chosen and the prefix is empty, when the file is read, then the prefix is guessed from it, and if the file holds default values the person is warned "This REG file contains data for default values, which cannot be applied to all policy sources."

**AC-3: It is that hive plus the user identifier; for.**
Given the file's first key belongs to the users hive, when the prefix is guessed, then it is that hive plus the user identifier; for any other first key, including the current-user hive, it is the hive name alone; a first key with no further backslash gives an empty prefix; a file with no keys gets the local-machine prefix.

**AC-4: It is reported as holding default values.**
Given any value in the file has an empty name, when the file is read, then it is reported as holding default values.

**AC-5: The person is only warned "An error occurred while.**
Given the guess fails, when the file is read, then the person is only warned "An error occurred while trying to guess the prefix." and the prefix stays empty.

## Terminologies

- Default value: The value of a registry key that has no name, written as an at sign in a registry file; not a value called default.

## Out of scope

The other tasks of this part of the product have their own stories: Import a registry file into a policy file; Cancel the registry import with Escape.
