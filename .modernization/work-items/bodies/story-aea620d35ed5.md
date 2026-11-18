# Read and write the stored form of values in a policy file

## Problem

- Files saved by Policy Plus are accepted by Windows and read back unchanged.

## Goal

- Read a policy file leniently and write it back with entries in order and values encoded as the format requires.

## Acceptance criteria

- Given a policy file with an extra empty character after a value name, when it is read, then the character is skipped.
- Given a policy file, when it is saved, then entries are written alphabetically so a key-clearing marker precedes the values it clears.
- Given a value, when it is written, then text, expandable text, 32-bit and 64-bit numbers and multiple strings use their own encoding, and every other type is stored as raw bytes with its type.
- Given text, when it is stored, then it is two-byte characters followed by a closing empty character.
- Given a multiple-string value, when it is stored, then each string is followed by an empty character and one more empty character closes the list.
- Given a 32-bit number, when it is stored, then it is 4 bytes, lowest byte first.
- Given a 64-bit number, when it is stored, then it is 8 bytes, lowest byte first.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Out of scope

- Anything a later story builds on top of this.
