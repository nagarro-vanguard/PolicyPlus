# Legacy reference: Read and write policy files byte for byte

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-c7d1bf28a69c",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "Text read from a policy file stops at its first empty character, and a multiple-string value ends at its first empty string.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 231,
            "lastLine": 239
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A stored policy file value is read back as text for text and expandable text, a 32-bit or 64-bit number for numbers, a list of strings for multiple strings, and raw bytes for every other type.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 320,
            "lastLine": 336
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A policy file is refused when its format version is not 1, with the message 'Unknown (newer) version of POL format'.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 34,
            "lastLine": 34
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A policy file is refused when it does not start with the 'PReg' signature, with the message 'Missing PReg signature'.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 33,
            "lastLine": 33
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When a policy file is read, an extra empty character after the value name, as Microsoft's documentation allows, is skipped.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 50,
            "lastLine": 50
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "When a policy file is saved, entries are written in alphabetical order, so a key-clearing marker is always written before the values it clears.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 77,
            "lastLine": 90
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "A multiple-string value is stored as its strings each followed by an empty character, with one more empty character closing the list.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 296,
            "lastLine": 311
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "A 64-bit number is stored in a policy file as 8 bytes, lowest byte first.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 272,
            "lastLine": 280
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "A 32-bit number is stored in a policy file as 4 bytes, lowest byte first.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 255,
            "lastLine": 264
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-10",
      "rules": [
        {
          "says": "Text stored in a policy file is written in two-byte characters followed by a closing empty character.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 240,
            "lastLine": 251
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-11",
      "rules": [
        {
          "says": "A value written to a policy file is stored as text, expandable text, a 32-bit or 64-bit number or a multiple string by its stated type. Every other type is stored as raw bytes with that type.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 337,
            "lastLine": 353
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-12",
      "rules": [
        {
          "says": "When a policy file is read and the same key and value name occur twice, the later entry wins. Key and value names are matched without regard to letter case, and the first spelling seen is kept for saving.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 59,
            "lastLine": 59
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
      "name": "Policy File Codec",
      "module": "policy-file-codec",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 231,
      "lastLine": 239
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 281,
      "lastLine": 295
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 320,
      "lastLine": 336
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 34,
      "lastLine": 34
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 33,
      "lastLine": 33
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 50,
      "lastLine": 50
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 77,
      "lastLine": 90
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 16,
      "lastLine": 18
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 296,
      "lastLine": 311
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 272,
      "lastLine": 280
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 255,
      "lastLine": 264
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 240,
      "lastLine": 251
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 337,
      "lastLine": 353
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 59,
      "lastLine": 59
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 20,
      "lastLine": 25
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 79,
      "lastLine": 82
    }
  ]
}
```

## What each criterion must keep

### AC-1

- Text read from a policy file stops at its first empty character, and a multiple-string value ends at its first empty string. (PolicyPlus/PolicySource.vb:231-239)

### AC-2

- A stored policy file value is read back as text for text and expandable text, a 32-bit or 64-bit number for numbers, a list of strings for multiple strings, and raw bytes for every other type. (PolicyPlus/PolicySource.vb:320-336)

### AC-3

- A policy file is refused when its format version is not 1, with the message 'Unknown (newer) version of POL format'. (PolicyPlus/PolicySource.vb:34-34)

### AC-4

- A policy file is refused when it does not start with the 'PReg' signature, with the message 'Missing PReg signature'. (PolicyPlus/PolicySource.vb:33-33)

### AC-5

- When a policy file is read, an extra empty character after the value name, as Microsoft's documentation allows, is skipped. (PolicyPlus/PolicySource.vb:50-50)

### AC-6

- When a policy file is saved, entries are written in alphabetical order, so a key-clearing marker is always written before the values it clears. (PolicyPlus/PolicySource.vb:77-90)

### AC-7

- A multiple-string value is stored as its strings each followed by an empty character, with one more empty character closing the list. (PolicyPlus/PolicySource.vb:296-311)

### AC-8

- A 64-bit number is stored in a policy file as 8 bytes, lowest byte first. (PolicyPlus/PolicySource.vb:272-280)

### AC-9

- A 32-bit number is stored in a policy file as 4 bytes, lowest byte first. (PolicyPlus/PolicySource.vb:255-264)

### AC-10

- Text stored in a policy file is written in two-byte characters followed by a closing empty character. (PolicyPlus/PolicySource.vb:240-251)

### AC-11

- A value written to a policy file is stored as text, expandable text, a 32-bit or 64-bit number or a multiple string by its stated type. Every other type is stored as raw bytes with that type. (PolicyPlus/PolicySource.vb:337-353)

### AC-12

- When a policy file is read and the same key and value name occur twice, the later entry wins. Key and value names are matched without regard to letter case, and the first spelling seen is kept for saving. (PolicyPlus/PolicySource.vb:59-59)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
