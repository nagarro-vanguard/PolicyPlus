# Legacy reference: Read and list values in policy files and registry policy keys

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-a8dd1d11e6d9",
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
      "ac": "AC-5",
      "rules": [
        {
          "says": "A registry key counts as a policy key when it is one of the three policy branches (software\\policies, software\\microsoft\\windows\\currentversion\\policies, system\\currentcontrolset\\policies) or lies below one, regardless of case.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 412,
            "lastLine": 415
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "A value in the live registry counts as present when its key exists and, unless the value name is empty, the key lists a value of that name, regardless of case. An empty name means the key itself.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 384,
            "lastLine": 390
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "The live registry never reports a value as marked for deletion.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 409,
            "lastLine": 411
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
      "firstLine": 110,
      "lastLine": 113
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 114,
      "lastLine": 117
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 139,
      "lastLine": 149
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 412,
      "lastLine": 415
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 429,
      "lastLine": 434
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 384,
      "lastLine": 390
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 409,
      "lastLine": 411
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before. (PolicyPlus/PolicySource.vb:118-135)

### AC-2

- A value in a policy file counts as present only if it is stored and not marked for deletion. (PolicyPlus/PolicySource.vb:110-113)

### AC-3

- Reading a value from a policy file gives nothing when the value is absent or marked for deletion. (PolicyPlus/PolicySource.vb:114-117)

### AC-4

- Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them. (PolicyPlus/PolicySource.vb:139-149)

### AC-5

- A registry key counts as a policy key when it is one of the three policy branches (software\policies, software\microsoft\windows\currentversion\policies, system\currentcontrolset\policies) or lies below one, regardless of case. (PolicyPlus/PolicySource.vb:412-415)

### AC-6

- A value in the live registry counts as present when its key exists and, unless the value name is empty, the key lists a value of that name, regardless of case. An empty name means the key itself. (PolicyPlus/PolicySource.vb:384-390)

### AC-7

- The live registry never reports a value as marked for deletion. (PolicyPlus/PolicySource.vb:409-411)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
