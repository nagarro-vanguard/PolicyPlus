# Describe products and support definitions in their detail views

## Problem

- People understand what a product or support definition covers.

## Goal

- Give the product and support detail views their labels, versions, parents, children and matching wording.

## Acceptance criteria

- Given a product, when details open, then it is labelled 'Major revision', 'Minor revision' or 'Top-level product' and shows a version only for major and minor revisions.
- Given a product, when details open, then a parent shows its name with the parent button enabled, none shows blank and disabled, and all child revisions are listed with version and name, empty if none.
- Given a support definition, when details open, then it states 'Match all the referenced products', 'Match any of the referenced products' or 'Do not match products'.
- Given a support definition entry, when listed, then it is named by the nested definition, else the product, else '<missing: ' plus the product code; versions are listed only for product entries naming a range, a missing bound blank.

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
