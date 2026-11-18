# Legacy reference: Hold a policy file's settings in memory and answer questions about them

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-e1c57c0f14b7",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 118,
            "lastLine": 135
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 139,
            "lastLine": 149
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "Reading a value from a policy file gives nothing when the value is absent or marked for deletion.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 114,
            "lastLine": 117
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A value in a policy file counts as present only if it is stored and not marked for deletion.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 110,
            "lastLine": 113
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. A value of the wrong kind is not present.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 87,
            "lastLine": 105
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 92,
            "lastLine": 98
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 105,
            "lastLine": 109
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 99,
            "lastLine": 104
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 183,
            "lastLine": 189
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "Text read from a policy file stops at its first empty character, and a multiple-string value ends at its first empty string.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A stored policy file value is read back as text for text and expandable text, a 32-bit or 64-bit number for numbers, a list of strings for multiple strings, and raw bytes for every other type.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A policy file is refused when its format version is not 1, with the message 'Unknown (newer) version of POL format'.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A policy file is refused when it does not start with the 'PReg' signature, with the message 'Missing PReg signature'.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "When a policy file is read, an extra empty character after the value name, as Microsoft's documentation allows, is skipped.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "When a policy file is saved, entries are written in alphabetical order, so a key-clearing marker is always written before the values it clears.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A multiple-string value is stored as its strings each followed by an empty character, with one more empty character closing the list.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A 64-bit number is stored in a policy file as 8 bytes, lowest byte first.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A 32-bit number is stored in a policy file as 4 bytes, lowest byte first.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "Text stored in a policy file is written in two-byte characters followed by a closing empty character.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "A value written to a policy file is stored as text, expandable text, a 32-bit or 64-bit number or a multiple string by its stated type. Every other type is stored as raw bytes with that type.",
      "builtBy": "Read and write policy files byte for byte"
    },
    {
      "says": "When a policy file is read and the same key and value name occur twice, the later entry wins. Key and value names are matched without regard to letter case, and the first spelling seen is kept for saving.",
      "builtBy": "Read and write policy files byte for byte"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Policy File Entries",
      "module": "policy-file-entries",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 118,
      "lastLine": 135
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 18,
      "lastLine": 18
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 105,
      "lastLine": 109
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 139,
      "lastLine": 149
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 114,
      "lastLine": 117
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 110,
      "lastLine": 113
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 87,
      "lastLine": 105
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 92,
      "lastLine": 98
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 105,
      "lastLine": 109
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 99,
      "lastLine": 104
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 183,
      "lastLine": 189
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before. (PolicyPlus/PolicySource.vb:118-135)

### AC-2

- Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them. (PolicyPlus/PolicySource.vb:139-149)

### AC-3

- Reading a value from a policy file gives nothing when the value is absent or marked for deletion. (PolicyPlus/PolicySource.vb:114-117)

### AC-4

- A value in a policy file counts as present only if it is stored and not marked for deletion. (PolicyPlus/PolicySource.vb:110-113)

### AC-5

- A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. A value of the wrong kind is not present. (PolicyPlus/PolicyProcessing.vb:87-105)

### AC-6

- When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared. (PolicyPlus/PolicySource.vb:92-98)

### AC-7

- When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed. (PolicyPlus/PolicySource.vb:105-109)

### AC-8

- When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it. (PolicyPlus/PolicySource.vb:99-104)

### AC-9

- When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored. (PolicyPlus/PolicySource.vb:183-189)

## Relies on, built elsewhere

- Text read from a policy file stops at its first empty character, and a multiple-string value ends at its first empty string. Built by: Read and write policy files byte for byte.
- A stored policy file value is read back as text for text and expandable text, a 32-bit or 64-bit number for numbers, a list of strings for multiple strings, and raw bytes for every other type. Built by: Read and write policy files byte for byte.
- A policy file is refused when its format version is not 1, with the message 'Unknown (newer) version of POL format'. Built by: Read and write policy files byte for byte.
- A policy file is refused when it does not start with the 'PReg' signature, with the message 'Missing PReg signature'. Built by: Read and write policy files byte for byte.
- When a policy file is read, an extra empty character after the value name, as Microsoft's documentation allows, is skipped. Built by: Read and write policy files byte for byte.
- When a policy file is saved, entries are written in alphabetical order, so a key-clearing marker is always written before the values it clears. Built by: Read and write policy files byte for byte.
- A multiple-string value is stored as its strings each followed by an empty character, with one more empty character closing the list. Built by: Read and write policy files byte for byte.
- A 64-bit number is stored in a policy file as 8 bytes, lowest byte first. Built by: Read and write policy files byte for byte.
- A 32-bit number is stored in a policy file as 4 bytes, lowest byte first. Built by: Read and write policy files byte for byte.
- Text stored in a policy file is written in two-byte characters followed by a closing empty character. Built by: Read and write policy files byte for byte.
- A value written to a policy file is stored as text, expandable text, a 32-bit or 64-bit number or a multiple string by its stated type. Every other type is stored as raw bytes with that type. Built by: Read and write policy files byte for byte.
- When a policy file is read and the same key and value name occur twice, the later entry wins. Key and value names are matched without regard to letter case, and the first spelling seen is kept for saving. Built by: Read and write policy files byte for byte.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
