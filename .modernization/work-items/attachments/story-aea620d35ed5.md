# Legacy reference: Read and write the stored form of values in a policy file

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-aea620d35ed5",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
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
      "ac": "AC-2",
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
      "ac": "AC-3",
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
      "ac": "AC-4",
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
      "ac": "AC-5",
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
      "ac": "AC-6",
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
      "ac": "AC-7",
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
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "cited": [
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
      "firstLine": 337,
      "lastLine": 353
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 240,
      "lastLine": 251
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 296,
      "lastLine": 311
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 255,
      "lastLine": 264
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 272,
      "lastLine": 280
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When a policy file is read, an extra empty character after the value name, as Microsoft's documentation allows, is skipped. (PolicyPlus/PolicySource.vb:50-50)

### AC-2

- When a policy file is saved, entries are written in alphabetical order, so a key-clearing marker is always written before the values it clears. (PolicyPlus/PolicySource.vb:77-90)

### AC-3

- A value written to a policy file is stored as text, expandable text, a 32-bit or 64-bit number or a multiple string by its stated type. Every other type is stored as raw bytes with that type. (PolicyPlus/PolicySource.vb:337-353)

### AC-4

- Text stored in a policy file is written in two-byte characters followed by a closing empty character. (PolicyPlus/PolicySource.vb:240-251)

### AC-5

- A multiple-string value is stored as its strings each followed by an empty character, with one more empty character closing the list. (PolicyPlus/PolicySource.vb:296-311)

### AC-6

- A 32-bit number is stored in a policy file as 4 bytes, lowest byte first. (PolicyPlus/PolicySource.vb:255-264)

### AC-7

- A 64-bit number is stored in a policy file as 8 bytes, lowest byte first. (PolicyPlus/PolicySource.vb:272-280)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
