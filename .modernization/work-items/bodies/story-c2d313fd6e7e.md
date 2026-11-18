# Read and write the machine's live policy settings

## Problem

- People apply policies straight to the machine, so this source must behave as the machine's own settings do.

## Goal

- Read, write, delete and clear the live policy settings of the machine, check the root names and test whether they can be written.

## Acceptance criteria

- Given the machine's settings are reached from the person's own machine, when they are read or changed, then the service does so on that machine only and the web app never does.
- Given the live settings, when a value is checked for deletion, then it is never reported as marked for deletion.
- Given a key and a value name, when presence is asked, then it is present when the key exists and, unless the name is empty, the key lists that name regardless of case; an empty name means the key itself.
- Given a missing key, when a value is read, then nothing is given; signed numbers come back as the unsigned numbers policies use and environment variables in text are not expanded.
- Given an unsigned 32-bit or 64-bit number, when it is saved, then it is stored as the signed number with the same bits and the key is created if missing.
- Given a key that does not exist, when a value is deleted, then nothing happens and no error is shown.
- Given a value, when it is forgotten, then it is deleted, since a pending deletion cannot be remembered.
- Given a key, when it is cleared, then every value in it is deleted but the key and its subkeys stay; forgetting a key's clearance does nothing.
- Given a settings source, when a test value cannot be written under Software\Policies and removed again, then the source is read-only.
- Given a source path, when it does not start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE in any case, then it is refused with "The root key is not valid."; otherwise the path is opened and created if missing.

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

- Live settings: The policy settings currently in force on the machine; not a saved policy file.

## Out of scope

- Anything a later story builds on top of this.
