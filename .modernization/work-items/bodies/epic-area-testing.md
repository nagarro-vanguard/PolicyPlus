# Set up testing

## Outcome

Developers have testing in place, as decided, before any journey is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose a real PostgreSQL over mocked queries because mocks hide migration and SQL faults, and chose port fakes over mocking reg.exe or PowerShell calls so domain and handler tests run anywhere; the trade-off is slower database tests and a Windows-gated subset. Assumes a Postgres instance is available locally or in CI via a container.

## Design

- Vitest for domain, contracts, database and api with fixture text for ADMX, ADML, POL and REG files; database tests run against a real PostgreSQL started by the test task, never a mock; Windows-only carriers are tested against fakes behind their ports plus a few Windows-gated tests; e2e is Playwright with axe against the running product, written before the code it tests; every rule and story carries its legacy rule as a test name.

## Data modelling

No finding: decided at build.

## Scale

No finding: decided at build.

## Security

No finding: decided at build.

## Isolation

No finding: decided at build.

## Performance

No finding: decided at build.

## Durability

No finding: decided at build.
