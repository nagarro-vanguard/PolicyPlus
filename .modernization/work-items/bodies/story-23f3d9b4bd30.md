# Share one set of code checks and commit rules across layers

## Problem

- One policy for every layer, and early failure beats failing in CI.

## Goal

- One shared setup for linting, formatting, unused-code checks, markdown checks and commit messages, run before every commit.

## Acceptance criteria

- Given a layer, when its checks are configured, then it extends the shared setup and adds no local lint or format rule.
- Given a commit message that is not a conventional commit, when the commit is made, then it is refused.
- Given a commit, when it is made, then the hooks run lint, format and the checks of the affected layers, and skipping hooks is not allowed.
- Given any layer, when the unused-code check runs, then it reports no unused files, exports or dependencies.

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
