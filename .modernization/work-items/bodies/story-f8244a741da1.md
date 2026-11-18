# Prove the journey: Write a policy source, or one branch of it, as an ...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Say where to write the exported settings.", then the system refuses to continue until a file name is given, and proposes the selected branch (or the whole policy file if none) and a prefix that fits the source being edited, user or machine..
- Given the product is ready, when the test does "Adjust the branch or prefix only if the default is not what is wanted.", then the system uses the text given as is, with any trailing separator on a branch removed..
- Given the product is ready, when the test does "Receive the settings file, or back out.", then the system takes the source as is when it is a policy file, or rebuilds it from the three policy locations with each value keeping its type when it comes from the machine settings, writes it with removals and deletions marked and values in the exported-settings format, and tells the person it worked or only that it failed, letting the person retry. Backing out writes nothing..

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
