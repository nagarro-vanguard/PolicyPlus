# Set the pattern for rules written as tested code

## Problem

- The legacy rules live as code and tests that cannot go stale silently, so every later story copies one proven pattern instead of inventing its own.

## Goal

- One worked example in the Domain layer: a named, pure rule function with a test named after the rule, domain terms taken from the analysis wording, typed errors, and a round-trip test, plus the AGENTS.md lines that record the pattern; and the OpenAPI document and client generated from hand-written Contracts.

## Acceptance criteria

- Given the example rule, when a developer reads the Domain layer, then the rule is one named pure function and its test carries the rule's name.
- Given malformed input to the example parser, when it runs, then it returns a typed Effect error and an unknown element is kept and reported, not dropped.
- Given text the example writer produced from the example parser's result, when it is compared with the original text, then the two match byte for byte where the format allows.
- Given a hand-written schema and HttpApi group in Contracts, when the generate script runs, then the OpenAPI document and the client are written from them, and CI fails if the committed OpenAPI document differs from the generated one.
- Given the AGENTS.md of each layer, when a developer reads it, then it states the layer's conventions and the reasons of the decisions that apply, and no separate wiki is needed.

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Out of scope

- Anything a later story builds on top of this.
