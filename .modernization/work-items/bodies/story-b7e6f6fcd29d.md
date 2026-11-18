# Prove the journey: Be offered the full set of policy definitions the ...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Start using the program for the first time.", then records that the offer has been considered, even if none is made, and never considers it again..
- Given the product is ready, when the test does "Have missing definitions noticed without having to check.", then works out whether the edition lacks Group Policy support and whether more than two non-empty categories name a missing parent..
- Given the product is ready, when the test does "Accept or put off the definitions.", then makes the welcome offer; yes starts getting the definitions..
- Given the product is ready, when the test does "Come back to the definitions later.", then keeps a standing invitation to get the definitions available without repeating the offer..

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
