# Serve the HTTP interface with thin handlers

## Problem

- Keeping rules out of handlers keeps them in the tested pure layer.

## Goal

- A local service on the person's machine that answers the screens through the contract, deciding nothing itself.

## Acceptance criteria

- Given a request, when a handler runs, then it only decodes with the contract, calls domain functions and carriers, and encodes the answer.
- Given a request that breaks a rule, when it is answered, then the decision comes from the domain layer and no rule is found in the handler.
- Given each outside system (file system, registry, directory, download), when the service is assembled, then each is one layer implementing a domain port.
- Given a test run or a machine that is not Windows, when the service starts, then the stand-in for each Windows carrier is used.

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
