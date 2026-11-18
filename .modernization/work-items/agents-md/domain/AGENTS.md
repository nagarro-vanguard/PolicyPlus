# Domain: the pure policy rules in TypeScript, with no I/O, one folder per capability

Stack: language and runtime: TypeScript on Bun, in a Turborepo workspace of packages and apps.

- No I/O, clock, randomness or environment access: functions take data in and return data or Effect values of data; outside systems arrive as ports declared here and implemented in apps/api.
- One folder per capability, named as in the plan; shared helpers go in a folder named for what they do, never utils or common.
- Parse ADMX, ADML, CMTX, POL and REG text into schema-checked values at the edge; downstream rules never see raw XML or bytes.

## Verify

- `bunx tsc --noEmit && bunx vitest run --passWithNoTests`
