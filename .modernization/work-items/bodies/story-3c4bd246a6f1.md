# Look up accounts and policy locations in the Active Directory domain

## Problem

- Only the person's machine is joined to the domain with their credentials, and a missing domain is a normal outcome.

## Goal

- The service resolves user and group accounts and their profile and policy-object locations from the machine's own directory tools, or says the domain is unavailable.

## Acceptance criteria

- Given a reachable domain, when an account is looked up, then its profile and policy-object locations are returned as plain data.
- Given no reachable domain, when an account is looked up, then the answer is a named unavailable outcome and not an error.
- Given a typed account name, when the lookup runs, then the name is validated first and passed as separate arguments.

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
