# Keep behaviour in code, tests and short agent notes

## Problem

- Knowledge kept in checked code cannot silently drift from the product.

## Goal

- A place for each kind of knowledge: behaviour in typed code and tests, rationale in the plan, and only what tools do not show in the agent notes of each layer.

## Acceptance criteria

- Given a contract schema, when the OpenAPI document is generated, then the documentation text on the schema appears in it.
- Given a domain folder, when it is opened, then it offers a typed index of what it exports and no prose readme.
- Given a test title, when it is read, then it cites the legacy rule it proves.
- Given the agent notes of a layer, when they are checked, then they hold only what code and tools do not show and copy no decision rationale from the plan.

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
