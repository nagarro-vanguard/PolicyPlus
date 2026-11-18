# Tooling: the shared TypeScript, ESLint, Prettier, knip, markdownlint, commitlint and lefthook configuration every layer extends, on Bun and Turborepo

Stack: language and runtime: TypeScript on Bun, in a Turborepo workspace of packages and apps; checks: Vitest for tests, Playwright with axe for black-box and accessibility tests, ESLint, Prettier, knip, markdownlint, commitlint with conventional commits, lefthook.

- Shared configuration is extended by each layer and not copied; changing a rule happens here only.

## Verify

- `bun run lint && bun run typecheck`
