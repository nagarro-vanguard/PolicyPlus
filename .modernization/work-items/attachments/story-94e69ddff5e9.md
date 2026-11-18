# Legacy reference: Settle each policy's state from the evidence in its source

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-94e69ddff5e9",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A policy with a registry value of its own counts as enabled evidence when that value holds its 'on' value, which is the number 1 when the template gives none, and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 20,
            "lastLine": 31
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 133,
            "lastLine": 166
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A policy's lists of on-values and off-values count as enabled or disabled evidence for each value in them that is present, using the list's own key when it names one.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 11,
            "lastLine": 18
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "For a policy's list elements, a marked-for-deletion list counts as one deleted element, and a list that holds any values counts as a present element and cancels that deletion.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 40,
            "lastLine": 49
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "For any other element (number, text, choice, multi-line text), a value marked for deletion counts as a deleted element and a value that is present counts as a present element.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 62,
            "lastLine": 68
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "For a checkbox element: a value marked for deletion counts as one deleted element. Otherwise, each present off value (or off-list value) counts a tenth of a deleted element, and each present on value (or on-list value) counts one present element. A checkbox whose template declares no on value or on list adds no present evidence, even if it holds 1.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 50,
            "lastLine": 61
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "If any element is present, the elements add their count to the enabled evidence; only when none is present do deleted elements add to the disabled evidence.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 70,
            "lastLine": 74
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "A policy is Enabled when enabled evidence exceeds disabled evidence, Disabled when disabled exceeds enabled, Not configured when there is no evidence either way, and Unclear when both are equal and above zero.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 77,
            "lastLine": 85
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "A policy's state in one area reads \"Enabled\", \"Disabled\", \"Not Configured\" or \"Unknown\"; the computer source is read for the computer area and the user source for any other.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 257,
            "lastLine": 266
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
      "name": "Enablement Evidence Reader",
      "module": "enablement-evidence-reader",
      "layer": "packages/ui"
    },
    {
      "name": "Policy State Provider",
      "module": "policy-state-provider",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 20,
      "lastLine": 31
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 87,
      "lastLine": 105
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 133,
      "lastLine": 166
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 187,
      "lastLine": 187
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 11,
      "lastLine": 18
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 32,
      "lastLine": 33
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 40,
      "lastLine": 49
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 62,
      "lastLine": 68
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 50,
      "lastLine": 61
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 11,
      "lastLine": 18
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 87,
      "lastLine": 105
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 70,
      "lastLine": 74
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 77,
      "lastLine": 85
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 257,
      "lastLine": 266
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A policy with a registry value of its own counts as enabled evidence when that value holds its 'on' value, which is the number 1 when the template gives none, and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none. (PolicyPlus/PolicyProcessing.vb:20-31)

### AC-2

- A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key. (PolicyPlus/AdmxFile.vb:133-166)

### AC-3

- A policy's lists of on-values and off-values count as enabled or disabled evidence for each value in them that is present, using the list's own key when it names one. (PolicyPlus/PolicyProcessing.vb:11-18)

### AC-4

- For a policy's list elements, a marked-for-deletion list counts as one deleted element, and a list that holds any values counts as a present element and cancels that deletion. (PolicyPlus/PolicyProcessing.vb:40-49)

### AC-5

- For any other element (number, text, choice, multi-line text), a value marked for deletion counts as a deleted element and a value that is present counts as a present element. (PolicyPlus/PolicyProcessing.vb:62-68)

### AC-6

- For a checkbox element: a value marked for deletion counts as one deleted element. Otherwise, each present off value (or off-list value) counts a tenth of a deleted element, and each present on value (or on-list value) counts one present element. A checkbox whose template declares no on value or on list adds no present evidence, even if it holds 1. (PolicyPlus/PolicyProcessing.vb:50-61)

### AC-7

- If any element is present, the elements add their count to the enabled evidence; only when none is present do deleted elements add to the disabled evidence. (PolicyPlus/PolicyProcessing.vb:70-74)

### AC-8

- A policy is Enabled when enabled evidence exceeds disabled evidence, Disabled when disabled exceeds enabled, Not configured when there is no evidence either way, and Unclear when both are equal and above zero. (PolicyPlus/PolicyProcessing.vb:77-85)

### AC-9

- A policy's state in one area reads "Enabled", "Disabled", "Not Configured" or "Unknown"; the computer source is read for the computer area and the user source for any other. (PolicyPlus/Main.vb:257-266)

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
