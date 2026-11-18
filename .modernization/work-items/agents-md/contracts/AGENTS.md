# Contracts: the Effect Schema types and the HttpApi contract the OpenAPI document is generated from

Stack: language and runtime: TypeScript on Bun, in a Turborepo workspace of packages and apps; services: Effect 4 HttpApi with Effect Schema, with an OpenAPI document generated from the same contract, served on Bun.

- Every request, response and error is an Effect Schema; define it once here and generate the OpenAPI document from the HttpApi, never write the document by hand.
- An outside system being absent or failing (no domain, no network, no admin rights) is a tagged result in the schema, not a thrown error or an HTTP 500.
- Do not import from any other workspace package; contracts depend only on effect.

## Verify

- `bunx tsc --noEmit && bunx vitest run --passWithNoTests`
