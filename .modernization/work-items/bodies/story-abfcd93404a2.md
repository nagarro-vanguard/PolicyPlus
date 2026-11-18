# Filter policies and keep search results

## Problem

- People narrow a large list of policies by managed or preference, comment and product.

## Goal

- Rules for the filters of the policy list and the life of the search results.

## Acceptance criteria

- Given a filter on managed policies, when it is applied, then preferences are hidden when managed policies are wanted and managed policies are hidden when preferences are wanted.
- Given several active filter parts, when a policy is tested, then it passes only if it passes every active part.
- Given a filter on comments, when it is applied, then it keeps only policies with a non-empty comment in the checked area, or only those with none, as chosen.
- Given a filter on products, when it is applied, then it keeps only policies supported by the chosen products, honouring the options to match any product and to include blank support.
- Given search results, when the search is cleared, then the results are forgotten and reopening them reports that no search has been run.

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
