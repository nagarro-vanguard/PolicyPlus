# End-to-end tests: the Playwright and axe tests that drive the running product, committed before the code they test

Stack: checks: Vitest for tests, Playwright with axe for black-box and accessibility tests, ESLint, Prettier, knip, markdownlint, commitlint with conventional commits, lefthook.

- Write each test from the story's acceptance criteria and commit it before the code; it fails first, and runs against the real api with fake Windows carriers.
- Every page visited is scanned with axe, and a violation fails the test.
- Select elements by role and accessible name, never by CSS class or test id unless no role exists.

## Verify

- `bunx playwright test --pass-with-no-tests`
