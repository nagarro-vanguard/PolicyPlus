# Set up testing

## Outcome

Developers have testing in place, as decided, before any capability is built on it.

## Scope

The layers and paths named in its stories.

Out of scope: the product's own behaviour.

## Comes after

- Set up the codebase

## What we found

- Chose a real PostgreSQL in Data tests over in-memory fakes because migrations and SQL behaviour are what can break. Chose black-box Playwright for end-to-end rules over component-only tests because the legacy behaviour is user-visible, and chose table-driven Vitest tests over adding Testing Library or a property-testing library because neither is in the stack and decision-9 allows no library outside it without a story. Assumes CI can run Docker and Playwright browsers; no coverage threshold is set because the inputs give none.

## Design

- Vitest per layer: Domain with example-based unit tests, table-driven over sample ADMX, ADML, POL, REG, CMTX and SPOL files, plus a round-trip test per parser and writer; Data against a real PostgreSQL test database, no mocks; API through the HttpApi test client; Components with Storybook stories and Screens with Vitest tests of their pure logic. Playwright with axe in layer-e2e drives the running product, one accessibility check per screen. A story is done when its layer checks and its black-box test pass.

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
