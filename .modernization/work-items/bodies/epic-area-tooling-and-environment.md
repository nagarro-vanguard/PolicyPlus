# Set up tooling and environment

## Outcome

Developers have tooling and environment in place, as decided, before any capability is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose Docker Compose for the local database over requiring a locally installed PostgreSQL because every developer and the black-box tests get the same version. Chose validated environment variables over config files because the service and screens share one place that fails fast. Assumes Docker is available to developers and CI.

## Design

- Bun is the package manager and runtime, pinned by a version file; Turborepo runs one task per layer (lint, typecheck, test, build) with declared inputs; local PostgreSQL runs from a Docker Compose file at the root; configuration is read from environment variables validated by Effect Schema at start-up, with an .env.example listing each; the Git version is a declared Turborepo input.

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
