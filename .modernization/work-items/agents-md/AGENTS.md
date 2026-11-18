# PolicyPlusWeb: the workspace, and the index of every layer

Each layer's AGENTS.md governs every line in its folder; this file also governs the workspace layer.

## Layers

| Layer | Path | Kind | Depends on |
| --- | --- | --- | --- |
| workspace | . | code | - |
| Tooling | packages/tooling | code | - |
| Domain | packages/domain | code | Tooling |
| Contracts | packages/contracts | code | Tooling |
| Data | packages/data | code | Tooling, Domain |
| Services | apps/api | code | Tooling, Domain, Contracts, Data |
| Components | packages/ui | code | Tooling |
| Screens | apps/web | code | Tooling, Components, Contracts |
| Black-box tests | apps/e2e | test | Tooling |

## Work tracking

(Written from the workspace's Work tracking section when scaffold runs.)

## Rules

- Commit with conventional commits; lefthook runs lint, format and typecheck on staged files before commit, and commitlint on the message.
- Run work through Turborepo (bun run check at the root); a layer imports only layers beneath it, and knip fails on unused exports or dependencies.
