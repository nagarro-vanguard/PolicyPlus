# Legacy reference: Read and write the machine's live policy settings

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-c2d313fd6e7e",
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
          "says": "The live registry never reports a value as marked for deletion.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 409,
            "lastLine": 411
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A value in the live registry counts as present when its key exists and, unless the value name is empty, the key lists a value of that name, regardless of case. An empty name means the key itself.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 384,
            "lastLine": 390
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "Reading a value from the live registry gives nothing when the key is missing. Signed numbers are returned as the unsigned numbers policies use, and environment variables in text are not expanded.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 391,
            "lastLine": 403
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 374,
            "lastLine": 383
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
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
      "ac": "AC-7",
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
      "ac": "AC-8",
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
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "A registry source counts as writable only when a test value can be written under Software\\Policies and removed again; otherwise it is read-only.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 52,
            "lastLine": 61
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-10",
      "rules": [
        {
          "says": "A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with \"The root key is not valid.\" A path after the root is opened, and created if missing.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 20,
            "lastLine": 37
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
      "name": "Live Registry Values",
      "module": "live-registry-values",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 409,
      "lastLine": 411
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 384,
      "lastLine": 390
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 391,
      "lastLine": 403
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 374,
      "lastLine": 383
    },
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
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 52,
      "lastLine": 61
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 20,
      "lastLine": 37
    }
  ]
}
```

## What each criterion must keep

### AC-1

No single legacy rule: it describes the behaviour as a whole.


### AC-2

- The live registry never reports a value as marked for deletion. (PolicyPlus/PolicySource.vb:409-411)

### AC-3

- A value in the live registry counts as present when its key exists and, unless the value name is empty, the key lists a value of that name, regardless of case. An empty name means the key itself. (PolicyPlus/PolicySource.vb:384-390)

### AC-4

- Reading a value from the live registry gives nothing when the key is missing. Signed numbers are returned as the unsigned numbers policies use, and environment variables in text are not expanded. (PolicyPlus/PolicySource.vb:391-403)

### AC-5

- When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing. (PolicyPlus/PolicySource.vb:374-383)

### AC-6

- When a value is deleted in the live registry and its key does not exist, nothing happens. A missing value is not an error. (PolicyPlus/PolicySource.vb:365-370)

### AC-7

- In the live registry, 'forgetting' a value deletes it, because the registry cannot remember a pending deletion. (PolicyPlus/PolicySource.vb:371-373)

### AC-8

- Clearing a key in the live registry deletes every value in it but leaves the key and its subkeys. Forgetting a key's clearance does nothing. (PolicyPlus/PolicySource.vb:416-420)

### AC-9

- A registry source counts as writable only when a test value can be written under Software\Policies and removed again; otherwise it is read-only. (PolicyPlus/PolicyLoader.vb:52-61)

### AC-10

- A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with "The root key is not valid." A path after the root is opened, and created if missing. (PolicyPlus/PolicyLoader.vb:20-37)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
