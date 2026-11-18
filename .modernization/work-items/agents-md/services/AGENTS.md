# Services: the Effect HttpApi service implementing the contract on Bun, and serving the OpenAPI document

Stack: services: Effect 4 HttpApi with Effect Schema, with an OpenAPI document generated from the same contract, served on Bun.

- Handlers only decode, call Domain and Data, and encode; no policy rule lives in a handler. Operational configuration (download URL, size limits, database address) comes from validated environment configuration; the product's own settings, such as the policy text language, are read through the Data repository (decision-4), not from configuration.
- Uploaded files are validated for size and type before parsing, and the Microsoft download accepts only the configured HTTPS host.

## Verify

- `bun run typecheck && bun run test`
