# Legacy reference: Read and write remembered preferences in the preference store

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-e53a6407cc3b",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": []
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "When the program's settings area in the registry cannot be opened or created, the program carries on without it: settings read as their defaults, changes are dropped, and the person is not told, so settings are not remembered between runs.",
          "where": {
            "file": "PolicyPlus/ConfigurationStorage.vb",
            "firstLine": 5,
            "lastLine": 9
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": []
    },
    {
      "ac": "AC-4",
      "rules": []
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Preference store adapter",
      "module": "preference-store-adapter",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/ConfigurationStorage.vb",
      "firstLine": 5,
      "lastLine": 9
    },
    {
      "file": "PolicyPlus/ConfigurationStorage.vb",
      "firstLine": 12,
      "lastLine": 12
    },
    {
      "file": "PolicyPlus/ConfigurationStorage.vb",
      "firstLine": 15,
      "lastLine": 15
    },
    {
      "file": "PolicyPlus/ConfigurationStorage.vb",
      "firstLine": 18,
      "lastLine": 18
    }
  ]
}
```

## What each criterion must keep

### AC-1

No single legacy rule: it describes the behaviour as a whole.


### AC-2

- When the program's settings area in the registry cannot be opened or created, the program carries on without it: settings read as their defaults, changes are dropped, and the person is not told, so settings are not remembered between runs. (PolicyPlus/ConfigurationStorage.vb:5-9)

### AC-3

No single legacy rule: it describes the behaviour as a whole.


### AC-4

No single legacy rule: it describes the behaviour as a whole.


## Reading of the existing code

The bundle for this part of the product was not built when this was written.
