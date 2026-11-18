# Set up the workspace, runtime and shared tooling

## Problem

- Every later story starts from the same checked, repeatable workspace, so a rule change happens in one place and developers get the same results locally and in CI.

## Goal

- A Bun and Turborepo workspace with one package or app per layer, a pinned Bun version, shared TypeScript, ESLint, Prettier, knip, markdownlint, commitlint and lefthook configuration that each layer extends, and a root check command.

## Acceptance criteria

- Given a fresh checkout, when a developer runs `bun install` and `bun run check` at the root, then Turborepo runs lint, typecheck, test and build for every layer and exits with code 0.
- Given the repository, when a developer lists the workspace, then the layers tooling, domain, contracts, data, api, ui, web and e2e each exist at their planned path and each extends the shared configuration without copying it.
- Given a layer that imports a layer above it or leaves an export unused, when `bun run check` runs, then the check fails and names the import or export.
- Given a commit with staged files that fail lint, format or typecheck, or a message that is not a conventional commit, when the developer commits, then lefthook rejects the commit and shows the failing check.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Out of scope

- Anything a later story builds on top of this.
