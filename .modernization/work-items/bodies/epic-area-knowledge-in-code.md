# Set up knowledge in code

## Outcome

Developers have knowledge in code in place, as decided, before any journey is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose schema annotations and test names as the home of knowledge over separate design documents because they are checked and cannot drift silently; the trade-off is that rationale beyond a line is found in the plan, not beside the code. Assumes agents and developers read AGENTS.md before editing a layer.

## Design

- Behaviour lives in code and tests, not prose: contract schemas carry doc annotations that feed the OpenAPI document, each domain folder has a short README-free index with typed exports, rule names in test titles cite the legacy rule, and AGENTS.md holds only what code and tools do not show; decisions with trade-offs are kept in the plan, not copied into source.

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
