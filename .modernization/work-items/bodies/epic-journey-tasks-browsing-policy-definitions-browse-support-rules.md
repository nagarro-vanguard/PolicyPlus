# Find the support rules and see which products they cover.

## Outcome

Start from a product and see which support rules cover it, or from a name, with the system working out coverage.

## Scope

This epic covers: LoadedSupportDefinitions.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Start from the product: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Support rule | new | none: new in this codebase | A named definition saying which products a policy works with, by matching all or any of them; it is not a policy or a product. |
