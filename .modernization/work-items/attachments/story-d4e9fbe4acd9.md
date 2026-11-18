# Legacy reference: Detect the Group Policy edition and read optional attributes

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-d4e9fbe4acd9",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The computer counts as having the Group Policy infrastructure only when the number Windows gives for its edition equals one of 59 fixed codes in a list. The edition is asked for as Windows version 6.0, and the result of the call is not checked. When the call fails the edition stays 0, which is not in the list, so the computer counts as having none.",
          "where": {
            "file": "PolicyPlus/SystemInfo.vb",
            "firstLine": 3,
            "lastLine": 11
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "An XML attribute that is absent gives nothing.",
          "where": {
            "file": "PolicyPlus/XmlExtensions.vb",
            "firstLine": 6,
            "lastLine": 8
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
      "file": "PolicyPlus/SystemInfo.vb",
      "firstLine": 3,
      "lastLine": 11
    },
    {
      "file": "PolicyPlus/XmlExtensions.vb",
      "firstLine": 6,
      "lastLine": 8
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The computer counts as having the Group Policy infrastructure only when the number Windows gives for its edition equals one of 59 fixed codes in a list. The edition is asked for as Windows version 6.0, and the result of the call is not checked. When the call fails the edition stays 0, which is not in the list, so the computer counts as having none. (PolicyPlus/SystemInfo.vb:3-11)

### AC-2

- An XML attribute that is absent gives nothing. (PolicyPlus/XmlExtensions.vb:6-8)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
