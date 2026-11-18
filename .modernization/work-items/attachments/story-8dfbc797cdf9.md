# Legacy reference: Edit entries of a REG file within its source branch

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-8dfbc797cdf9",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "When a value is saved into a REG file, it is ignored if a source branch is set and its key lies outside that branch. When no branch is set, every key is accepted. Any value already stored under that name is replaced.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 226,
            "lastLine": 236
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "When a value is deleted in a REG file, the request is ignored if a source branch is set and the key lies outside it, or if the key is already marked for removal. When no branch is set, every key is accepted. Otherwise the value is recorded as deleted.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 240,
            "lastLine": 247
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "When a key is cleared in a REG file, the request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted. Otherwise the key's earlier entries are replaced by a key-removal entry.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 248,
            "lastLine": 253
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "When a key's clearance is forgotten in a REG file, the key-removal entry is dropped if it exists. The request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 254,
            "lastLine": 259
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A REG file cannot be used as a source for forgetting a value: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 237,
            "lastLine": 239
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
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 226,
      "lastLine": 236
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 210,
      "lastLine": 213
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 240,
      "lastLine": 247
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 248,
      "lastLine": 253
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 254,
      "lastLine": 259
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 237,
      "lastLine": 239
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When a value is saved into a REG file, it is ignored if a source branch is set and its key lies outside that branch. When no branch is set, every key is accepted. Any value already stored under that name is replaced. (PolicyPlus/RegFile.vb:226-236)

### AC-2

- When a value is deleted in a REG file, the request is ignored if a source branch is set and the key lies outside it, or if the key is already marked for removal. When no branch is set, every key is accepted. Otherwise the value is recorded as deleted. (PolicyPlus/RegFile.vb:240-247)

### AC-3

- When a key is cleared in a REG file, the request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted. Otherwise the key's earlier entries are replaced by a key-removal entry. (PolicyPlus/RegFile.vb:248-253)

### AC-4

- When a key's clearance is forgotten in a REG file, the key-removal entry is dropped if it exists. The request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted. (PolicyPlus/RegFile.vb:254-259)

### AC-5

- A REG file cannot be used as a source for forgetting a value: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch. (PolicyPlus/RegFile.vb:237-239)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
