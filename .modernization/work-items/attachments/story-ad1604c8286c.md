# Legacy reference: Apply one policy file's changes onto another source

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-ad1604c8286c",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "When a policy file's changes are applied to another source, an entry is saved only if it has a non-empty value name that does not start with '**'. Other marker-style entries and entries with an empty value name are skipped without notice. A saved value keeps its original letter case and type.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 169,
            "lastLine": 172
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "When a policy file's changes are applied to another source, an entry starting '**deletekeys' clears each key named in its semicolon-separated list under the entry's key, using lower-case names. Clearing removes only that key's own values, not its subkeys.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 165,
            "lastLine": 168
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "When a policy file's changes are applied to another source, an entry named '**deletevalues' deletes each value in its semicolon-separated list, using lower-case names.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 161,
            "lastLine": 164
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "When a policy file's changes are applied to another source, an entry named '**del.' plus a value name deletes that value, using the lower-case key and value names.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 157,
            "lastLine": 158
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When a policy file's changes are applied to another source, an entry starting '**delvals' clears the whole key, using the lower-case key name. Entries are applied in sorted order, so clear-all entries come before values. Clearing a live registry key removes only that key's own values.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 159,
            "lastLine": 160
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "When a newer policy file is applied over an older one, values the old file held and the new one dropped are forgotten in the target, but only if they sit under the three policy branches of the registry.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 174,
            "lastLine": 177
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "Reading a value from a policy file gives nothing when the value is absent or marked for deletion.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "A value in a policy file counts as present only if it is stored and not marked for deletion.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. A value of the wrong kind is not present.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
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
      "name": "Policy Change Applier",
      "module": "policy-change-applier",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 169,
      "lastLine": 172
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 165,
      "lastLine": 168
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 416,
      "lastLine": 420
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 161,
      "lastLine": 164
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 157,
      "lastLine": 158
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 159,
      "lastLine": 160
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 416,
      "lastLine": 420
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 183,
      "lastLine": 189
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 152,
      "lastLine": 153
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 429,
      "lastLine": 434
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When a policy file's changes are applied to another source, an entry is saved only if it has a non-empty value name that does not start with '**'. Other marker-style entries and entries with an empty value name are skipped without notice. A saved value keeps its original letter case and type. (PolicyPlus/PolicySource.vb:169-172)

### AC-2

- When a policy file's changes are applied to another source, an entry starting '**deletekeys' clears each key named in its semicolon-separated list under the entry's key, using lower-case names. Clearing removes only that key's own values, not its subkeys. (PolicyPlus/PolicySource.vb:165-168)

### AC-3

- When a policy file's changes are applied to another source, an entry named '**deletevalues' deletes each value in its semicolon-separated list, using lower-case names. (PolicyPlus/PolicySource.vb:161-164)

### AC-4

- When a policy file's changes are applied to another source, an entry named '**del.' plus a value name deletes that value, using the lower-case key and value names. (PolicyPlus/PolicySource.vb:157-158)

### AC-5

- When a policy file's changes are applied to another source, an entry starting '**delvals' clears the whole key, using the lower-case key name. Entries are applied in sorted order, so clear-all entries come before values. Clearing a live registry key removes only that key's own values. (PolicyPlus/PolicySource.vb:159-160)

### AC-6

- When a newer policy file is applied over an older one, values the old file held and the new one dropped are forgotten in the target, but only if they sit under the three policy branches of the registry. (PolicyPlus/PolicySource.vb:174-177)

## Relies on, built elsewhere

- A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before. Built by: Hold a policy file's settings in memory and answer questions about them.
- Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them. Built by: Hold a policy file's settings in memory and answer questions about them.
- Reading a value from a policy file gives nothing when the value is absent or marked for deletion. Built by: Hold a policy file's settings in memory and answer questions about them.
- A value in a policy file counts as present only if it is stored and not marked for deletion. Built by: Hold a policy file's settings in memory and answer questions about them.
- A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. A value of the wrong kind is not present. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored. Built by: Hold a policy file's settings in memory and answer questions about them.
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
