# Prove the journey: Make the newly downloaded policy definitions the o...

## Problem

- the journey keeps working as the product changes, in the interface the team ships

## Goal

- an acceptance test that does the journey from its first step to its last, as people will do it

## Acceptance criteria

- Given the product is ready, when the test does "Say that the downloaded definitions should become the ones in use.", then the system takes the downloaded folder and finds the template files in it, ignoring everything else..
- Given the product is ready, when the test does "Be sure each template comes with its text in my language.", then the system picks the language text for each template, preferring the person's language, then the same language family, then English, and refuses a template with none or with a flawed text..
- Given the product is ready, when the test does "Be sure the templates are sound.", then the system reads and validates every template beside the current definitions, skipping and listing the ones it refuses and stopping at once on a missing namespace..
- Given the product is ready, when the test does "Understand what the policies, categories and products mean.", then the system works out the categories, products, support rules, policies, options and their layouts for entering values, with their names and descriptions in the language..
- Given the product is ready, when the test does "Switch to the new definitions.", then the system empties the workspace, adds the staged definitions to the available ones, and remembers the folder as the definitions folder; with no new folder nothing changes..
- Given the product is ready, when the test does "Know what went wrong.", then the system shows nothing when all loaded, otherwise lists each problem, and asks whether to continue only where a choice is wanted..
- Given the product is ready, when the test does "Start working with the new definitions.", then the system presents the category tree with nothing selected, the empty state in the information pane, and previous search results forgotten..
- Given the product is ready, when the test does "See each policy's setting and comment as before.", then the system works out each policy's state and comment in each area from the stored settings and the live ones, and applies the filters..

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
