# Legacy reference: Set, delete and forget values and key clearances in a policy file

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-f35a43c9e5e3",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
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
      "ac": "AC-2",
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
      "ac": "AC-3",
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
      "ac": "AC-4",
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
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When a key's clearance is forgotten in a policy file, every clear-all marker for that key is removed.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 190,
            "lastLine": 195
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
      "firstLine": 105,
      "lastLine": 109
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 92,
      "lastLine": 98
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
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 190,
      "lastLine": 195
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed. (PolicyPlus/PolicySource.vb:105-109)

### AC-2

- When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared. (PolicyPlus/PolicySource.vb:92-98)

### AC-3

- When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it. (PolicyPlus/PolicySource.vb:99-104)

### AC-4

- When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored. (PolicyPlus/PolicySource.vb:183-189)

### AC-5

- When a key's clearance is forgotten in a policy file, every clear-all marker for that key is removed. (PolicyPlus/PolicySource.vb:190-195)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
