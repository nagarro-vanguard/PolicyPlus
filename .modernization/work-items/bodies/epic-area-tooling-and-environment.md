# Set up tooling and environment

## Outcome

Developers have tooling and environment in place, as decided, before any journey is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose Turborepo task names that every layer implements over per-layer ad hoc scripts so one command verifies any layer and CI stays uniform; chose Effect Config over reading process.env freely so missing values fail at start. Assumes developers can build on any OS but the registry and directory carriers only function on Windows, so those carriers sit behind ports with in-memory fakes elsewhere.

## Design

- Bun runs scripts and the API, Turborepo orchestrates one task name per layer (lint, typecheck, test, build) cached by inputs, TypeScript is strict with project references, configuration comes from typed environment values read once through Effect Config, and the app targets Windows 10 and 11 only, run locally as api plus web.

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
