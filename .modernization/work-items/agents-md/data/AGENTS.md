# Data: the PostgreSQL schema, Drizzle on Effect SQL repositories and Drizzle Kit migrations

Stack: data: PostgreSQL through Drizzle on Effect SQL, with Drizzle Kit migrations.

- Schema changes only through Drizzle Kit migrations committed with the change; a migration is never edited after it merges.
- Repositories return Domain types, not Drizzle rows, and run inside Effect SQL transactions when more than one table changes.

## Verify

- `bun run typecheck && bun run test && bun run migrations:check`
