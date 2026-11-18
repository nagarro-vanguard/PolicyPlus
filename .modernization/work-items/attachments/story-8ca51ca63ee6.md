# Legacy reference: Work out whether a policy is enabled or disabled from its values

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-8ca51ca63ee6",
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
      "ac": "AC-3",
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
      "ac": "AC-4",
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
      "ac": "AC-5",
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
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
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
      "firstLine": 70,
      "lastLine": 74
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A policy with a registry value of its own counts as enabled evidence when that value holds its 'on' value, which is the number 1 when the template gives none, and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none. (PolicyPlus/PolicyProcessing.vb:20-31)

### AC-2

- A policy's lists of on-values and off-values count as enabled or disabled evidence for each value in them that is present, using the list's own key when it names one. (PolicyPlus/PolicyProcessing.vb:11-18)

### AC-3

- For a policy's list elements, a marked-for-deletion list counts as one deleted element, and a list that holds any values counts as a present element and cancels that deletion. (PolicyPlus/PolicyProcessing.vb:40-49)

### AC-4

- For any other element (number, text, choice, multi-line text), a value marked for deletion counts as a deleted element and a value that is present counts as a present element. (PolicyPlus/PolicyProcessing.vb:62-68)

### AC-5

- If any element is present, the elements add their count to the enabled evidence; only when none is present do deleted elements add to the disabled evidence. (PolicyPlus/PolicyProcessing.vb:70-74)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
