# Offer the area choice and reopen the last search results

## Problem

- People start with every policy in view and can return to their results without searching again.

## Goal

- The area list offers exactly three choices and starts on both areas, and the last search results and chosen position can be reopened without a new search until the search is cleared.

## Acceptance criteria

- Given the program starts, when the area list shows, then it starts on "User or Computer", the first choice, so both user and computer policies are shown.
- Given the area list, when the person opens it, then it offers only "User or Computer", "User" and "Computer", with no free text.
- Given no search has been run or it was cleared, when the person opens the results from the main window, then they are told "No search has been run yet, so there are no results to display." and nothing opens.
- Given search results exist, when the person chooses "Search Results", then the last results are reopened and no new search starts.
- Given the results window is reopened, when the previously selected result is still in the list, then it is selected again.
- Given results are held, when the search is cleared, then the results are forgotten and reopening them reports that no search has been run.

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
