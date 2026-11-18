# Set up knowledge in code

## Outcome

Developers have knowledge in code in place, as decided, before any capability is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose rules as tested pure functions with intention-revealing names over a prose rules document because tests cannot go stale silently. Chose comments only for non-obvious legacy quirks over commenting everything to avoid noise. Assumes the analysis vocabulary is stable enough to name code after.

## Design

- The legacy rules live as code and tests, not documents: each rule is a named, pure Domain function with a test named after the rule, a short comment naming the legacy source only where the reason is not evident, and domain terms in code match the analysis wording. The Effect Schema types and HttpApi groups are written by hand in Contracts; only the OpenAPI document and the client are generated from them, never hand-written. Decision reasons live in AGENTS.md lines and the story, not in a separate wiki.

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
