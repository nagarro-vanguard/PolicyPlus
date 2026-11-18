# Fix the libraries every layer may use

## Problem

- One schema language and a small, I/O-free parser set keep the Domain testable and avoid duplicate types, and nothing enters without a story that needs it.

## Goal

- The agreed libraries installed: Effect 4 with Schema, HttpApi, HttpClient and SQL; Drizzle ORM and Kit; fast-xml-parser; fflate; TanStack Query and Form; and the rule, written in AGENTS.md, that no library outside this stack is added without a story that needs it.

## Acceptance criteria

- Given the workspace after `bun install`, when a developer lists the installed dependencies, then Effect 4, Drizzle ORM, Drizzle Kit, fast-xml-parser, fflate, TanStack Query and TanStack Form are present and Zod is absent.
- Given a dependency that is listed in a layer but never imported, or an export that nothing uses, when `bun run check` runs, then knip fails and names it.
- Given the root AGENTS.md, when a developer reads it, then it states that no library outside the agreed stack is added without a story that needs it.
- Given a small sample ADMX file and a small zip archive, when a Domain test parses the first with fast-xml-parser and unpacks the second with fflate in memory under Bun, then both succeed with no file, network or database access.

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
