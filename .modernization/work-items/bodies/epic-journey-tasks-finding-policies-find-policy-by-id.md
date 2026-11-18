# Go straight to a known category, product, support definition or policy by typing its identifier.

## Outcome

The system recognises the identifier and takes the person there in one step, telling them plainly when it cannot.

## Scope

This epic covers: Main; FindById.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Type and arrive: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Support definition | new | none: new in this codebase | A named list of products and nested definitions that says what a policy is supported on; not a single product. |
| Chosen products | new | none: new in this codebase | The products the person has ticked as the ones that matter when judging support. |
| Any-of matching | new | none: new in this codebase | A way of judging in which a definition that would normally need every entry needs only one; it applies only when it is asked for. |
| Unlisted policies allowed | new | none: new in this codebase | A choice that lets a policy count as supported when it lists no supported-on information. |
| Identifier | new | none: new in this codebase | The text a person types to name one category, product, support definition or policy; not its display name. |
| Section ending | new | none: new in this codebase | An optional "@U" or "@C" at the end of a policy identifier that limits it to the user or computer section; not part of the identifier itself. |
