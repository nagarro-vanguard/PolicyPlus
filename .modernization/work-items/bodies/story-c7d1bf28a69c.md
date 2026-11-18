# Read and write policy files byte for byte

## Problem

- Policy files are what Windows reads, so a file saved here must be read back exactly and a bad file must be refused with a clear message.

## Goal

- Turn the bytes of a policy file into entries and entries back into bytes, with its signature, version, text and number encodings, ordering and duplicate handling.

## Acceptance criteria

- Given text in a policy file, when it is read, then it stops at its first empty character, and a multiple-string value ends at its first empty string.
- Given a stored value, when it is read back, then it is text for text and expandable text, a 32-bit or 64-bit number for numbers, a list of strings for multiple strings, and raw bytes for every other type.
- Given a file whose format version is not 1, when it is read, then it is refused with 'Unknown (newer) version of POL format'.
- Given a file that does not start with the 'PReg' signature, when it is read, then it is refused with 'Missing PReg signature'.
- Given an extra empty character after a value name, when the file is read, then it is skipped, as Microsoft's documentation allows.
- Given entries, when the file is saved, then they are written in alphabetical order so a key-clearing marker comes before the values it clears.
- Given a multiple-string value, when it is saved, then each string is followed by an empty character and one more empty character closes the list.
- Given a 64-bit number, when it is saved, then it is 8 bytes, lowest byte first.
- Given a 32-bit number, when it is saved, then it is 4 bytes, lowest byte first.
- Given text, when it is saved, then it is written in two-byte characters followed by a closing empty character.
- Given a value, when it is saved, then text, expandable text, 32-bit and 64-bit numbers and multiple strings are stored by their stated type and every other type as raw bytes with that type.
- Given the same key and value name twice in a file, when it is read, then the later entry wins, names match without regard to letter case, and the first spelling seen is kept for saving.

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Terminologies

- Policy file: A saved file of policy settings for one machine or user; not the definitions that describe the policies.

## Out of scope

- Anything a later story builds on top of this.
