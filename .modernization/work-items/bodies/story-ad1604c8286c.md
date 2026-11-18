# Apply one policy file's changes onto another source

## Problem

- Administrators can bring one policy file's settings into another source and trust that deletions and removals carry over exactly.

## Goal

- When a policy file's changes are applied to another source, each entry is saved, deleted or cleared as the file says, and values a newer file dropped are forgotten.

## Acceptance criteria

- Given a policy file with entries, when its changes are applied to another source, then an entry is saved only if it has a value name that is not empty and does not start with '**', and the saved value keeps its letter case and type; other marker-style entries and entries with an empty value name are skipped without a message.
- Given an entry starting '**deletekeys', when the changes are applied, then each key in its semicolon-separated list under the entry's key is cleared, using lower-case names, and only that key's own values go, not its subkeys.
- Given an entry named '**deletevalues', when the changes are applied, then each value in its semicolon-separated list is deleted, using lower-case names.
- Given an entry named '**del.' followed by a value name, when the changes are applied, then that value is deleted, using the lower-case key and value names.
- Given an entry starting '**delvals', when the changes are applied, then the whole key is cleared, using the lower-case key name; entries are applied in sorted order so clear-all entries come before values, and clearing a live registry key removes only that key's own values.
- Given a newer policy file applied over an older one, when the older file held values the newer one dropped, then those values are forgotten in the target, but only when they sit under the three policy branches of the registry.

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

- Marker-style entry: A policy file entry whose name starts with '**' and tells the program to delete or clear something instead of storing a value; it is not a stored setting.

## Out of scope

- Anything a later story builds on top of this.
