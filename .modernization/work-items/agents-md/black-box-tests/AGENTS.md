# Black-box tests: the Playwright and axe tests that drive the running product through its screens and API

Stack: checks: Vitest for tests, Playwright with axe for black-box and accessibility tests, ESLint, Prettier, knip, markdownlint, commitlint with conventional commits, lefthook.

- Tests drive only screens and the public API against a seeded database, assert accessibility with axe on each screen, and never reach into code of other layers.

## Verify

- `bun run typecheck && bun run test:list`
