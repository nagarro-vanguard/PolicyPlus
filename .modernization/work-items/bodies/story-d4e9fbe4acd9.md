# Detect the Group Policy edition and read optional attributes

## Problem

- Keeps one tested rule for whether an edition counts as having Group Policy infrastructure, and keeps template reading from failing on optional data. The legacy reason for the edition check (telling people whether built-in Group Policy is available) is not part of the rule itself.

## Goal

- Build two small shared rules: deciding from an edition number whether a Windows edition has the Group Policy infrastructure, and reading an XML attribute that may be absent. The decisions make the service server rendered with no sight of the user's machine and name no place where the edition is read, so the number is an input the rule receives; which source supplies it is not decided and is left to the product owner.

## Acceptance criteria

- Given an edition number supplied to the rule (0 when none could be obtained), when it equals one of the 59 fixed edition codes, then the edition counts as having the Group Policy infrastructure; otherwise, including 0, it counts as having none. The rule reads no machine itself, because the service cannot see the user's machine; where the number comes from is not decided and is flagged to the product owner.
- Given an XML attribute that is absent, when it is read, then nothing is returned.

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
