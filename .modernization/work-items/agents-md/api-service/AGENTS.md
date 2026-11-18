# API service: the Effect HttpApi handlers served on Bun, which carry the outside systems and call domain and database

Stack: language and runtime: TypeScript on Bun, in a Turborepo workspace of packages and apps; services: Effect 4 HttpApi with Effect Schema, with an OpenAPI document generated from the same contract, served on Bun.

- Handlers are thin: decode with the contract, call domain functions and carriers, encode; rules never live in a handler.
- Each outside system (file system, registry, directory, download) is one Effect Layer implementing a domain port; the Windows ones have an in-memory fake used in tests and non-Windows runs.
- Spawn reg.exe and PowerShell with an argument array, never a built shell string, and validate key paths and account names against the contract schema first.
- Writes to a policy file go to a temporary file and are renamed over the target so a failed save never leaves a half-written file.

## Verify

- `bunx tsc --noEmit && bunx vitest run --passWithNoTests`
