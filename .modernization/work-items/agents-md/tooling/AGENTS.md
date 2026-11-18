# Tooling: the shared ESLint, Prettier, knip, markdownlint, commitlint and lefthook configuration

Stack: checks: Vitest for tests, Playwright with axe for black-box and accessibility tests, ESLint, Prettier, knip, markdownlint, commitlint with conventional commits, lefthook.

- Layers extend the shared configs here and add no local lint or format rules; a rule change is made here once.
- Commits follow conventional commits and lefthook runs lint, format and the affected layers' checks before commit; skipping hooks is not allowed.
- knip must pass with no unused files, exports or dependencies in any layer.

## Verify

- `bunx eslint . && bunx prettier --check . && bunx knip`
