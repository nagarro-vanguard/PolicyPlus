# Read and write policy files with a byte-faithful round trip

## Problem

- Policy files must be read and saved without loss or surprise, because people overwrite real policy files with the output.

## Goal

- Domain parsing and writing of POL files, with the typing of stored values. A POL file arrives by upload and leaves as a download (integrations.decision-1).

## Acceptance criteria

- Given a policy file that does not start with the 'PReg' signature, when it is read, then it is refused with 'Missing PReg signature'.
- Given a policy file whose format version is not 1, when it is read, then it is refused with 'Unknown (newer) version of POL format'.
- Given the same key and value name twice, when the file is read, then the later entry wins, names match regardless of letter case and the first spelling seen is kept for saving.
- Given text or a multiple-string value, when it is read, then text stops at its first empty character and a multiple-string value ends at its first empty string.
- Given a stored value, when it is read back, then text and expandable text give text, numbers give 32-bit or 64-bit numbers, multiple strings give a list of strings and every other type gives raw bytes.
- Given a policy file read without change, when it is written back, then its bytes are identical wherever the legacy format allows; a value is written as the type it was read as, and an unknown element is kept and reported rather than dropped.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Terminologies

- POL file: A Registry.pol policy file that holds registry keys and values for computers or users; not a REG file, which is text.

## Out of scope

- Anything a later story builds on top of this.
