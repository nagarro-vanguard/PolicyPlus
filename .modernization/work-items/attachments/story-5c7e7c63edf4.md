# Legacy reference: Offer the area choice and reopen the last search results

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-5c7e7c63edf4",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The list of areas starts on \"User or Computer\", the first choice, so both user and computer policies are shown at start.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 39,
            "lastLine": 39
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "The area choice offers only \"User or Computer\", \"User\" and \"Computer\", with no free text.",
          "where": {
            "file": "PolicyPlus/Main.Designer.vb",
            "firstLine": 409,
            "lastLine": 410
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "When search results are opened from the main window and no search has been run (or it was cleared), the person is told \"No search has been run yet, so there are no results to display.\" and nothing opens.",
          "where": {
            "file": "PolicyPlus/FindResults.vb",
            "firstLine": 27,
            "lastLine": 37
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "\"Search Results\" only reopens the last results and starts no new search.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 653,
            "lastLine": 653
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When the results window is reopened, the previously selected result is selected again if it is still in the list.",
          "where": {
            "file": "PolicyPlus/FindResults.vb",
            "firstLine": 95,
            "lastLine": 105
          },
          "doubt": "The code restores the remembered position when it is still inside the list (index below the count), not 'if the result is still in the list': nothing checks that the same policy is there. Reword to position, which is what a rebuilder must keep."
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "Clearing the search forgets the results, so reopening them reports that no search has been run.",
          "where": {
            "file": "PolicyPlus/FindResults.vb",
            "firstLine": 38,
            "lastLine": 41
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Area Scope Chooser",
      "module": "area-scope-chooser",
      "layer": "packages/ui"
    },
    {
      "name": "Result Recall",
      "module": "result-recall",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 39,
      "lastLine": 39
    },
    {
      "file": "PolicyPlus/Main.Designer.vb",
      "firstLine": 410,
      "lastLine": 410
    },
    {
      "file": "PolicyPlus/Main.Designer.vb",
      "firstLine": 409,
      "lastLine": 410
    },
    {
      "file": "PolicyPlus/FindResults.vb",
      "firstLine": 27,
      "lastLine": 37
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 653,
      "lastLine": 653
    },
    {
      "file": "PolicyPlus/FindResults.vb",
      "firstLine": 95,
      "lastLine": 105
    },
    {
      "file": "PolicyPlus/FindResults.vb",
      "firstLine": 38,
      "lastLine": 41
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The list of areas starts on "User or Computer", the first choice, so both user and computer policies are shown at start. (PolicyPlus/Main.vb:39-39)

### AC-2

- The area choice offers only "User or Computer", "User" and "Computer", with no free text. (PolicyPlus/Main.Designer.vb:409-410)

### AC-3

- When search results are opened from the main window and no search has been run (or it was cleared), the person is told "No search has been run yet, so there are no results to display." and nothing opens. (PolicyPlus/FindResults.vb:27-37)

### AC-4

- "Search Results" only reopens the last results and starts no new search. (PolicyPlus/Main.vb:653-653)

### AC-5

- When the results window is reopened, the previously selected result is selected again if it is still in the list. (PolicyPlus/FindResults.vb:95-105) Doubt: The code restores the remembered position when it is still inside the list (index below the count), not 'if the result is still in the list': nothing checks that the same policy is there. Reword to position, which is what a rebuilder must keep.

### AC-6

- Clearing the search forgets the results, so reopening them reports that no search has been run. (PolicyPlus/FindResults.vb:38-41)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
