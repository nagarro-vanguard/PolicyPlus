# Set up libraries

## Outcome

Developers have libraries in place, as decided, before any capability is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose one schema library (Effect Schema) for contract, validation and OpenAPI over adding Zod because a second schema language would duplicate every type. Chose fast-xml-parser and fflate (small, pure JS, run on Bun) over Node-only native modules because Domain must stay free of I/O. Assumes the template archive format stays zip-compatible and files are small.

## Design

- Effect 4 with Effect Schema, HttpApi, HttpClient and Effect SQL for contracts, API, data and the Microsoft download; Drizzle ORM and Drizzle Kit for the schema and migrations; fast-xml-parser for ADMX, ADML and CMTX text; fflate for unpacking the Microsoft archive in memory; TanStack Query and Form in Screens; Zod is not used. No library outside the stack is added without a story that needs it.

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
