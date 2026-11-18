# Legacy reference: Read a policy's saved state from its stored values

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-a1881cb358d7",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The saved value of a number or text element is read as stored; the reading assumes the value exists and is of the right kind, and is not checked first. A checkbox is read by its own rule.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 140,
            "lastLine": 146
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "The saved value of a multi-line text element is read as stored, without first checking that it exists.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 184,
            "lastLine": 185
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A checkbox is on when its on value (or all values of its on list) is present, or, with neither defined, when its value is 1; it is off in every other case, including when its off value is present.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 190,
            "lastLine": 206
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A list of values counts as present only when every value in it is present.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 106,
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
          "says": "A choice element is read as the position of the first item whose own value is present and, when the item has a value list, whose list is wholly present; when no item matches, the position is -1.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 170,
            "lastLine": 183
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "A list element whose entries have names the person provides is read as every stored name with its value, under the element's key.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 149,
            "lastLine": 154
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "A list element whose entry names do not matter is read as a list of values: when the list has a prefix, the stored values named prefix1, prefix2, and so on, in order, until the first number that is missing; otherwise every stored value name under the key.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 155,
            "lastLine": 169
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
      "firstLine": 140,
      "lastLine": 146
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 184,
      "lastLine": 185
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 190,
      "lastLine": 206
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 106,
      "lastLine": 113
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 170,
      "lastLine": 183
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 149,
      "lastLine": 154
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 155,
      "lastLine": 169
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The saved value of a number or text element is read as stored; the reading assumes the value exists and is of the right kind, and is not checked first. A checkbox is read by its own rule. (PolicyPlus/PolicyProcessing.vb:140-146)

### AC-2

- The saved value of a multi-line text element is read as stored, without first checking that it exists. (PolicyPlus/PolicyProcessing.vb:184-185)

### AC-3

- A checkbox is on when its on value (or all values of its on list) is present, or, with neither defined, when its value is 1; it is off in every other case, including when its off value is present. (PolicyPlus/PolicyProcessing.vb:190-206)

### AC-4

- A list of values counts as present only when every value in it is present. (PolicyPlus/PolicyProcessing.vb:106-113)

### AC-5

- A choice element is read as the position of the first item whose own value is present and, when the item has a value list, whose list is wholly present; when no item matches, the position is -1. (PolicyPlus/PolicyProcessing.vb:170-183)

### AC-6

- A list element whose entries have names the person provides is read as every stored name with its value, under the element's key. (PolicyPlus/PolicyProcessing.vb:149-154)

### AC-7

- A list element whose entry names do not matter is read as a list of values: when the list has a prefix, the stored values named prefix1, prefix2, and so on, in order, until the first number that is missing; otherwise every stored value name under the key. (PolicyPlus/PolicyProcessing.vb:155-169)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
