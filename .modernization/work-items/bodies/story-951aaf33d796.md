# Build the web app shell, data access, messages and forms

## Problem

- Screens must stay unprivileged, speak the person's chosen language and reject the same input as the service.

## Goal

- The screens' frame: server-rendered routes that fetch through the generated client, show every visible text as a translatable message, and validate forms with the contract.

## Acceptance criteria

- Given a screen, when it fetches data, then it uses a client generated from the contract through TanStack Query with no hand-written calls or copied response types.
- Given the product language is switched, when a screen is shown, then every visible text changes and policy text from definitions stays as data, untranslated.
- Given a form with invalid input, when it is submitted, then the client rejects it with the same rules the service would apply.
- Given a page is rendered on the server, when it loads data, then it asks the service over HTTP and itself reads no disk or registry.

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
