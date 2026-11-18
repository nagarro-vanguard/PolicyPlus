# PolicyPlusWeb: the workspace, and the index of every layer

Each layer's AGENTS.md governs every line in its folder; this file also governs the workspace layer.

## Layers

| Layer | Path | Kind | Depends on |
| --- | --- | --- | --- |
| workspace | . | code | - |
| Contracts | packages/contracts | code | - |
| Domain | packages/domain | code | Contracts |
| Database | packages/database | code | Contracts |
| API service | apps/api | code | Contracts, Domain, Database |
| UI components | packages/ui | code | - |
| Web app | apps/web | code | Contracts, UI components |
| End-to-end tests | apps/e2e | test | - |
| Tooling | packages/tooling | code | - |

## Work tracking

(Written from the workspace's Work tracking section when scaffold runs.)
