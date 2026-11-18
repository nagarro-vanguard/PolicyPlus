# Read and list values in policy files and registry policy keys

## Problem

- Editing and saving policies depends on reading present and deleted values exactly as Group Policy files record them.

## Goal

- Build the shared rules that decide which values a policy file or policy registry key holds, which are marked for deletion and which keys count as policy keys.

## Acceptance criteria

- Given a policy file, when a value is checked, then it is marked for deletion when a deletion marker names it, the key has a clear-all marker, or a delete-values list for the key names it, regardless of case; entries are examined in sorted order, and a value sorting after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came first.
- Given a policy file, when a value is checked for presence, then it is present only if stored and not marked for deletion.
- Given a policy file, when a value is read, then nothing is returned when it is absent or marked for deletion.
- Given a key in a policy file, when its values are listed, then marker entries are left out unless the caller asks for them.
- Given a registry key, when it is judged, then it counts as a policy key when it is one of the three policy branches or below one, regardless of case.
- Given an imported registry source, when a value is checked for presence, then it is present when its key exists and, unless the name is empty, lists a value of that name regardless of case, an empty name meaning the key itself.
- Given an imported registry source, when a value is checked for deletion, then it is never reported as marked for deletion.

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

- Marked for deletion: A value a policy file records as to be removed when applied; not a value that is simply absent.
- Policy key: A registry key within one of the three policy branches; not any registry key.

## Out of scope

- Anything a later story builds on top of this.
