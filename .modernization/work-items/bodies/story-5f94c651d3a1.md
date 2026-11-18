# Define the contract schemas and generate the interface document

## Problem

- Screens and service cannot disagree about what is exchanged when there is one source.

## Goal

- Every request, answer and failure between the screens and the service is described once as a schema, and the interface document is generated from it.

## Acceptance criteria

- Given any request, response or error, when the contracts are inspected, then it is defined once as a schema and not written by hand elsewhere.
- Given the service contract, when the build runs, then the OpenAPI document is generated from it and no hand-written copy exists.
- Given a missing domain, no network or no administrator rights, when the service answers, then the answer is a named outcome in the schema and not an error response.
- Given the contracts package, when its dependencies are checked, then it depends only on the effect library and imports no other workspace package.

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
