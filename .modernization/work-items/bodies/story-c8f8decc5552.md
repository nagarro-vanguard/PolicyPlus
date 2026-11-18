# Download and unpack the Microsoft policy template package

## Problem

- The package must be unpacked into a Windows folder, which a browser cannot do, and having no internet is a normal outcome.

## Goal

- The service downloads the package from the Microsoft download site, unpacks it into the chosen folder and reports progress and failure.

## Acceptance criteria

- Given internet access, when a download starts, then the service fetches the package, unpacks it into the chosen folder and reports progress to the screen.
- Given no internet access or a refused download, when it is attempted, then the answer is a named failure outcome and the folder is left as it was.
- Given the web app, when a download is wanted, then it asks the service and never calls the Microsoft site itself.

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
