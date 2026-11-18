# Set up the test approach with fixtures and a real database

## Problem

- Rules and stories are only trusted if they can be proven the same way on any machine.

## Goal

- The way every part is tested: fixture text for template, policy and registry files, a real PostgreSQL for data tests, stand-ins for Windows carriers and tests named after the legacy rule.

## Acceptance criteria

- Given the test command for domain, contracts, database or service, when it runs, then it uses fixture text for ADMX, ADML, POL and REG files.
- Given a database test, when it runs, then a real PostgreSQL is started by the test task and no mocked client is used.
- Given a test of a Windows-only carrier, when it runs on a machine that is not Windows, then it runs against the stand-in behind its port and the few Windows-gated tests are skipped with a stated reason.
- Given a rule or story that is built, when its test is listed, then the title names the legacy rule it proves.
- Given an end-to-end test, when it is written for a story, then it exists and fails before the code it tests is added.

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
