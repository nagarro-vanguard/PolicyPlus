# Legacy reference: Replace live registry changes with the registry source model

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-8b2e2d3c7b29",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "When a value is deleted in the live registry and its key does not exist, nothing happens. A missing value is not an error.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 365,
            "lastLine": 370
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "In the live registry, 'forgetting' a value deletes it, because the registry cannot remember a pending deletion.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 371,
            "lastLine": 373
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "Clearing a key in the live registry deletes every value in it but leaves the key and its subkeys. Forgetting a key's clearance does nothing.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 416,
            "lastLine": 420
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
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 365,
      "lastLine": 370
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 371,
      "lastLine": 373
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 416,
      "lastLine": 420
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 421,
      "lastLine": 423
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When a value is deleted in the live registry and its key does not exist, nothing happens. A missing value is not an error. (PolicyPlus/PolicySource.vb:365-370)

### AC-2

- In the live registry, 'forgetting' a value deletes it, because the registry cannot remember a pending deletion. (PolicyPlus/PolicySource.vb:371-373)

### AC-3

- Clearing a key in the live registry deletes every value in it but leaves the key and its subkeys. Forgetting a key's clearance does nothing. (PolicyPlus/PolicySource.vb:416-420)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
