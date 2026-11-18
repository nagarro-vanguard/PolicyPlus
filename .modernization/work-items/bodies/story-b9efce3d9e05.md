# Build the policy rules as a pure layer with named ports

## Problem

- Rules that touch no disk, clock or registry can be tested with fixture text anywhere.

## Goal

- The policy rules live in one folder per capability, take data in and return data, and meet the outside world only through named ports.

## Acceptance criteria

- Given any function in the domain layer, when it runs in a test, then it reads no file, clock, random value or environment and returns data or an Effect of data.
- Given an outside system the rules need, when the domain is inspected, then it is declared as a port there and implemented only in the service.
- Given the domain layer, when its folders are listed, then there is one folder per capability named as in the plan, and shared helpers sit in folders named for what they do, never utils or common.
- Given ADMX, ADML, CMTX, POL or REG text, when it enters the domain, then it is parsed at the edge into schema-checked values and later rules never see raw text or bytes.
- Given malformed input, when it is parsed, then it is refused at the edge with a named failure and nothing downstream runs.

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Out of scope

- Anything a later story builds on top of this.
