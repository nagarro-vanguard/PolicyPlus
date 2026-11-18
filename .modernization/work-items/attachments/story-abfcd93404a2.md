# Legacy reference: Filter policies and keep search results

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-abfcd93404a2",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A filter on managed policies hides preferences when managed policies are wanted, and hides managed policies when preferences are wanted.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 411,
            "lastLine": 413
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A policy passes the filter only when it passes every active part of it.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 411,
            "lastLine": 434
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A filter on comments keeps only policies that have a non-empty comment in the checked area, or only those that have none, as chosen.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 427,
            "lastLine": 430
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A filter on products keeps only policies supported by the chosen products, honouring the options to match any product and to include policies with blank support.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 431,
            "lastLine": 433
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
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
  "cited": [
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 411,
      "lastLine": 413
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 411,
      "lastLine": 434
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 427,
      "lastLine": 430
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 431,
      "lastLine": 433
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

- A filter on managed policies hides preferences when managed policies are wanted, and hides managed policies when preferences are wanted. (PolicyPlus/Main.vb:411-413)

### AC-2

- A policy passes the filter only when it passes every active part of it. (PolicyPlus/Main.vb:411-434)

### AC-3

- A filter on comments keeps only policies that have a non-empty comment in the checked area, or only those that have none, as chosen. (PolicyPlus/Main.vb:427-430)

### AC-4

- A filter on products keeps only policies supported by the chosen products, honouring the options to match any product and to include policies with blank support. (PolicyPlus/Main.vb:431-433)

### AC-5

- Clearing the search forgets the results, so reopening them reports that no search has been run. (PolicyPlus/FindResults.vb:38-41)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
