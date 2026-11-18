# Legacy reference: Read policies, products and options from template files

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-ad5a2f6c129f",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A category's explanation is optional. A category with any content inside it (even a comment) must contain a parent entry with a reference; otherwise the template is refused as invalid.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 105,
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
          "says": "Products form three levels: a product, its major versions and their minor versions; deeper levels are not read, and each version must carry a version index or the file is refused as invalid.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 74,
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
          "says": "A registry value in a template is a delete marker, a number or a text, decided by the first of those it contains; a value with none of them is treated as a delete marker.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 115,
            "lastLine": 132
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 133,
            "lastLine": 166
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A policy takes its category and its 'supported on' rule from the references in its own content, and has options only when it contains an options section.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 188,
            "lastLine": 195
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "A policy option of any kind other than number, yes/no, text, list, choice or multi-line text is dropped without notice.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 244,
            "lastLine": 254
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "A number option accepts 0 to 4,294,967,295 unless the template sets other limits, overwrites existing values unless marked soft, and is stored as a number unless marked as text; unreadable attribute values fall back to these defaults.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 199,
            "lastLine": 205
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "A text option allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise; unreadable attribute values fall back to these defaults.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 210,
            "lastLine": 216
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "A yes/no option takes its registry effect for true and false from true and false values and lists.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 206,
            "lastLine": 209
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-10",
      "rules": [
        {
          "says": "A choice option is optional unless marked required. Each choice keeps whichever of a single registry value and a list of values it contains, both when both are present; a choice with neither is accepted and changes nothing.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 225,
            "lastLine": 243
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-11",
      "rules": [
        {
          "says": "An option's registry value name is taken from its own value name, except for a list option that has a value prefix attribute: the prefix is used and the own value name only when that prefix is empty. A list option counts as prefixed whenever the attribute is present, even if empty.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 248,
            "lastLine": 250
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
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 105,
      "lastLine": 110
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 37,
      "lastLine": 43
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 74,
      "lastLine": 98
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 115,
      "lastLine": 132
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 22,
      "lastLine": 26
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 133,
      "lastLine": 166
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 187,
      "lastLine": 187
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 188,
      "lastLine": 195
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 244,
      "lastLine": 254
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 198,
      "lastLine": 246
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 199,
      "lastLine": 205
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 210,
      "lastLine": 216
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 206,
      "lastLine": 209
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 225,
      "lastLine": 243
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 248,
      "lastLine": 250
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 222,
      "lastLine": 224
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A category's explanation is optional. A category with any content inside it (even a comment) must contain a parent entry with a reference; otherwise the template is refused as invalid. (PolicyPlus/AdmxFile.vb:105-110)

### AC-2

- Products form three levels: a product, its major versions and their minor versions; deeper levels are not read, and each version must carry a version index or the file is refused as invalid. (PolicyPlus/AdmxFile.vb:74-98)

### AC-3

- A registry value in a template is a delete marker, a number or a text, decided by the first of those it contains; a value with none of them is treated as a delete marker. (PolicyPlus/AdmxFile.vb:115-132)

### AC-4

- A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key. (PolicyPlus/AdmxFile.vb:133-166)

### AC-5

- A policy takes its category and its 'supported on' rule from the references in its own content, and has options only when it contains an options section. (PolicyPlus/AdmxFile.vb:188-195)

### AC-6

- A policy option of any kind other than number, yes/no, text, list, choice or multi-line text is dropped without notice. (PolicyPlus/AdmxFile.vb:244-254)

### AC-7

- A number option accepts 0 to 4,294,967,295 unless the template sets other limits, overwrites existing values unless marked soft, and is stored as a number unless marked as text; unreadable attribute values fall back to these defaults. (PolicyPlus/AdmxFile.vb:199-205)

### AC-8

- A text option allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise; unreadable attribute values fall back to these defaults. (PolicyPlus/AdmxFile.vb:210-216)

### AC-9

- A yes/no option takes its registry effect for true and false from true and false values and lists. (PolicyPlus/AdmxFile.vb:206-209)

### AC-10

- A choice option is optional unless marked required. Each choice keeps whichever of a single registry value and a list of values it contains, both when both are present; a choice with neither is accepted and changes nothing. (PolicyPlus/AdmxFile.vb:225-243)

### AC-11

- An option's registry value name is taken from its own value name, except for a list option that has a value prefix attribute: the prefix is used and the own value name only when that prefix is empty. A list option counts as prefixed whenever the attribute is present, even if empty. (PolicyPlus/AdmxFile.vb:248-250)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
