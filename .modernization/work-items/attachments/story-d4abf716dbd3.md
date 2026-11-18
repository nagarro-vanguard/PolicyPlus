# Legacy reference: Open another user's stored settings file as a source

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-d4abf716dbd3",
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
          "says": "A user hive source is mounted by loading the hive file under a fresh temporary name in the machine registry, after the backup and restore privileges are switched on. If the hive cannot be opened afterwards, the source becomes an empty, read-only scratch source instead, without telling the person.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 62,
            "lastLine": 79
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "When a source is closed, a mounted user hive is unloaded and the result tells whether unloading succeeded; every other kind of source closes successfully.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 109,
            "lastLine": 116
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "The live registry never reports a value as marked for deletion.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "A value in the live registry counts as present when its key exists and, unless the value name is empty, the key lists a value of that name, regardless of case. An empty name means the key itself.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "Reading a value from the live registry gives nothing when the key is missing. Signed numbers are returned as the unsigned numbers policies use, and environment variables in text are not expanded.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "When a value is deleted in the live registry and its key does not exist, nothing happens. A missing value is not an error.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "In the live registry, 'forgetting' a value deletes it, because the registry cannot remember a pending deletion.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "Clearing a key in the live registry deletes every value in it but leaves the key and its subkeys. Forgetting a key's clearance does nothing.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "A registry source counts as writable only when a test value can be written under Software\\Policies and removed again; otherwise it is read-only.",
      "builtBy": "Read and write the machine's live policy settings"
    },
    {
      "says": "A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with \"The root key is not valid.\" A path after the root is opened, and created if missing.",
      "builtBy": "Read and write the machine's live policy settings"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "User Hive Mounter",
      "module": "user-hive-mounter",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 62,
      "lastLine": 79
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 109,
      "lastLine": 116
    }
  ]
}
```

## What each criterion must keep

### AC-1

No single legacy rule: it describes the behaviour as a whole.


### AC-2

- A user hive source is mounted by loading the hive file under a fresh temporary name in the machine registry, after the backup and restore privileges are switched on. If the hive cannot be opened afterwards, the source becomes an empty, read-only scratch source instead, without telling the person. (PolicyPlus/PolicyLoader.vb:62-79)

### AC-3

- When a source is closed, a mounted user hive is unloaded and the result tells whether unloading succeeded; every other kind of source closes successfully. (PolicyPlus/PolicyLoader.vb:109-116)

## Relies on, built elsewhere

- The live registry never reports a value as marked for deletion. Built by: Read and write the machine's live policy settings.
- A value in the live registry counts as present when its key exists and, unless the value name is empty, the key lists a value of that name, regardless of case. An empty name means the key itself. Built by: Read and write the machine's live policy settings.
- Reading a value from the live registry gives nothing when the key is missing. Signed numbers are returned as the unsigned numbers policies use, and environment variables in text are not expanded. Built by: Read and write the machine's live policy settings.
- When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing. Built by: Read and write the machine's live policy settings.
- When a value is deleted in the live registry and its key does not exist, nothing happens. A missing value is not an error. Built by: Read and write the machine's live policy settings.
- In the live registry, 'forgetting' a value deletes it, because the registry cannot remember a pending deletion. Built by: Read and write the machine's live policy settings.
- Clearing a key in the live registry deletes every value in it but leaves the key and its subkeys. Forgetting a key's clearance does nothing. Built by: Read and write the machine's live policy settings.
- A registry source counts as writable only when a test value can be written under Software\Policies and removed again; otherwise it is read-only. Built by: Read and write the machine's live policy settings.
- A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with "The root key is not valid." A path after the root is opened, and created if missing. Built by: Read and write the machine's live policy settings.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
