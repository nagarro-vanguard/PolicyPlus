# Set up the shared workspace and the approved libraries

## Problem

- Without one agreed set of tools and libraries each part drifts and the program cannot be built and checked the same way everywhere.
- Open point: Should existing registry settings of the old program be imported once into the new preference store?

## Goal

- One workspace in which every part of Policy Plus is built, with only the approved libraries for reading policy template text, unpacking the Microsoft package and wiring services.

## Acceptance criteria

- Given a fresh checkout, when a developer runs the install and the verify command for any layer, then the same task names (lint, typecheck, test, build) exist and succeed for every layer.
- Given the workspace is checked on a machine that is not Windows, when the build and tests run, then they succeed using the stand-in versions of the Windows-only carriers.
- Given a required setting is missing, when the service or the web app starts, then it stops at start with a message naming the missing setting.
- Given the dependency list, when it is checked, then it holds only the stack's libraries plus the approved XML reader and zip reader, and no second state or validation library.
- Given a policy template file with well-formed text, when it is read with the approved XML reader, then its values come back and are checked against a schema afterwards.
- Given the Microsoft template package as a standard zip, when it is unpacked with the approved zip reader, then its files are listed and readable without any native build step.

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
