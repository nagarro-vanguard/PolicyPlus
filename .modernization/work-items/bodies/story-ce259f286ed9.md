# Work out where each source's policy and comment files live

## Problem

- Every source reads and saves its settings and comments in the right place without the person having to type paths.

## Goal

- From a source's kind and the detail given, the program decides the location of its policy file and of its comment file.

## Acceptance criteria

- Given a source of a certain kind, when its policy file location is needed, then Local GPO uses the Registry.pol of the system's local Group Policy (user or machine folder) and its gpt.ini, a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers, a POL file and a user hive use the path given, and Scratch space has none.
- Given a source, when its comment file location is needed, then it sits beside the source's file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or a per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); and Scratch space has none, so comments are unavailable.

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
