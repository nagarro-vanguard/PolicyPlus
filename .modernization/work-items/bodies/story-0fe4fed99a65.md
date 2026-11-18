# Prove the journey: Open a policy file for direct editing of its raw k...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Start editing the policy file, understanding the risk the first time", then takes the one allowed area backed by a policy file, asking only when both are and saying plainly when none is; shows the caution only to a person who has not accepted it, remembering a yes and asking again after a no..
- Given the product is ready, when the test does "Find and work on entries in the file", then shows the file as an ordered tree, and offers only the actions that fit the selected key, value or deletion entry..
- Given the product is ready, when the test does "See what I have changed before leaving, then finish", then summarises the changes made in this session and reminds the person that they reach disk only when policies are saved; leaving, however it is done, keeps the changes..

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
