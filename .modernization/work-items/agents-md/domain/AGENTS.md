# Domain: the pure policy rules: reading policy definitions, resolving and editing policy state, with no I/O framework

Stack: language and runtime: TypeScript on Bun, in a Turborepo workspace of packages and apps.

- Pure code only: no file, network, database or clock access; take inputs as arguments and return typed results or Effect errors.
- Model failure as typed Effect errors (for example malformed ADMX), never thrown exceptions or null; an unknown policy element is kept and reported, not silently dropped.
- Policy values and POL, REG and CMTX text round-trip byte-faithfully where the legacy format allows; a round-trip test accompanies every parser and writer.

## Verify

- `bun run typecheck && bun run test`
