# Prove the journey: Get back to the policy work where it was left: the...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Have my preferences remembered", then recovers the remembered preferences; when they cannot be kept, carries on with defaults and does not stop the person..
- Given the product is ready, when the test does "Get back to the policy sources I used last", then reopens the remembered user and computer sources, or the local Group Policy on first start; closes any sources already open, works out each source's location and whether it can be saved, and falls back to the defaults with a notice when the remembered ones cannot be reached..
- Given the product is ready, when the test does "Get the policy definitions I last used", then loads the definitions from the remembered folder, or the system default, and offers the default when the remembered folder fails; when the problems found are minor, asks whether to keep the partly loaded set..
- Given the product is ready, when the test does "Have my policy comments alongside", then finds the comments that belong to each source; a source whose comments cannot be read simply has none..
- Given the product is ready, when the test does "Know whether the workspace is ready to change", then states once which sources can be fully changed and which can only be viewed or kept in memory, and names the sources; says nothing beyond the notice when everything is writable..
- Given the product is ready, when the test does "Browse everything", then shows the categories with user and computer policies together..

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Out of scope

- Anything a later story builds on top of this.
