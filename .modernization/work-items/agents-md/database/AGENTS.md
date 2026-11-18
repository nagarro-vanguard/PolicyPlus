# Database: the Drizzle schema, Drizzle Kit migrations and Effect SQL queries on PostgreSQL

Stack: data: PostgreSQL through Drizzle on Effect SQL, with Drizzle Kit migrations.

- Change the schema only through a Drizzle Kit migration that is committed; never edit a generated migration after it is merged.
- Queries are Effect SQL functions returning contract types' data shapes; callers never receive Drizzle table objects.
- Tests run against a real PostgreSQL with migrations applied from empty; no mocked client.

## Verify

- `bunx tsc --noEmit && bunx vitest run --passWithNoTests && bunx drizzle-kit check`
