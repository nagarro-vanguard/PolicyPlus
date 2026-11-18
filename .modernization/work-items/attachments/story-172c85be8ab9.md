# Legacy reference: Read and write policy files with a byte-faithful round trip

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-172c85be8ab9",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
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
      "ac": "AC-2",
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
      "ac": "AC-3",
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
    },
    {
      "ac": "AC-4",
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
      "ac": "AC-5",
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
      "ac": "AC-6",
      "rules": []
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "cited": [
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 33,
      "lastLine": 33
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 34,
      "lastLine": 34
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
    },
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
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A policy file is refused when it does not start with the 'PReg' signature, with the message 'Missing PReg signature'. (PolicyPlus/PolicySource.vb:33-33)

### AC-2

- A policy file is refused when its format version is not 1, with the message 'Unknown (newer) version of POL format'. (PolicyPlus/PolicySource.vb:34-34)

### AC-3

- When a policy file is read and the same key and value name occur twice, the later entry wins. Key and value names are matched without regard to letter case, and the first spelling seen is kept for saving. (PolicyPlus/PolicySource.vb:59-59)

### AC-4

- Text read from a policy file stops at its first empty character, and a multiple-string value ends at its first empty string. (PolicyPlus/PolicySource.vb:231-239)

### AC-5

- A stored policy file value is read back as text for text and expandable text, a 32-bit or 64-bit number for numbers, a list of strings for multiple strings, and raw bytes for every other type. (PolicyPlus/PolicySource.vb:320-336)

### AC-6

No single legacy rule: it describes the behaviour as a whole.


## Reading of the existing code

The bundle for this part of the product was not built when this was written.
