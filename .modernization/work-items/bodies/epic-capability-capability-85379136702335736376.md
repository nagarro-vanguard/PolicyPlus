# Carry over finding policies

## Outcome

Narrow the policy list by filter and find policies by ID, text or registry key and value, then pick a result.

## Scope

This epic covers: DoubleClickIgnoringTreeView; FilterOptions; Main; FindById; FindByText; FindByRegistry; FindResults.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Journeys

- Narrow the list with a filter: a new journey in this codebase.
- Jump to an item by its ID: a new journey in this codebase.
- Search for a policy: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Supported on | new | none: new in this codebase | The filter condition that keeps policies supported by the chosen products; it is not the Policy type or Current state condition. |
| Product requirement box | new | none: new in this codebase | The part of the filter dialog holding the product list and the two matching options; it is not the whole dialog. |
| Filter | new | none: new in this codebase | The set of conditions on type, state, comment and supported products that a policy must meet to be listed; it is not a search. |
| Find by ID | new | none: new in this codebase | The lookup of one item by its identifier; it is not a text search. |
| Wildcard word | new | none: new in this codebase | A search word containing * or ? that matches any run or any one character; it is not a plain word. |
| Hit | new | none: new in this codebase | A policy that meets the search; it is not a policy merely listed. |
| Search results | new | none: new in this codebase | The policies a search found, kept so the person can return to them; it is not the filter. |
