# Legacy reference: Read settings screen layouts from language files

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-a8ee9482f2c5",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "Only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept in a screen layout; any other control in the language file is dropped without notice.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 106,
            "lastLine": 110
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A number box takes default value 1, shows its up-down spinner and steps by 1 unless the language file says otherwise; an unreadable attribute value falls back to the same defaults.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 54,
            "lastLine": 58
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A check box starts unticked unless the language file marks it ticked.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 74,
            "lastLine": 74
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "Entries of a combo box or drop-down list are sorted unless the language file says not to sort them.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 79,
            "lastLine": 79
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A drop-down list has a preselected item only when the language file names one; otherwise none is preselected.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 94,
            "lastLine": 94
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
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 106,
      "lastLine": 110
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 49,
      "lastLine": 104
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 54,
      "lastLine": 58
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 74,
      "lastLine": 74
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 79,
      "lastLine": 79
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 93,
      "lastLine": 93
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 94,
      "lastLine": 94
    }
  ]
}
```

## What each criterion must keep

### AC-1

- Only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept in a screen layout; any other control in the language file is dropped without notice. (PolicyPlus/AdmlFile.vb:106-110)

### AC-2

- A number box takes default value 1, shows its up-down spinner and steps by 1 unless the language file says otherwise; an unreadable attribute value falls back to the same defaults. (PolicyPlus/AdmlFile.vb:54-58)

### AC-3

- A check box starts unticked unless the language file marks it ticked. (PolicyPlus/AdmlFile.vb:74-74)

### AC-4

- Entries of a combo box or drop-down list are sorted unless the language file says not to sort them. (PolicyPlus/AdmlFile.vb:79-79)

### AC-5

- A drop-down list has a preselected item only when the language file names one; otherwise none is preselected. (PolicyPlus/AdmlFile.vb:94-94)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
