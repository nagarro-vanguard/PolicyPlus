# Legacy reference: Work out categories, products, policies and the...: Policy option reader

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-fd0811a4ba30",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A registry value in a template is a delete marker, a number or a text, decided by the first of those it contains; a value with none of them is treated as a delete marker.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 115,
            "lastLine": 132
          },
          "doubt": ""
        },
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
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A policy option of any kind other than number, yes/no, text, list, choice or multi-line text is dropped without notice.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 244,
            "lastLine": 254
          },
          "doubt": ""
        },
        {
          "says": "A yes/no option takes its registry effect for true and false from true and false values and lists.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 206,
            "lastLine": 209
          },
          "doubt": ""
        },
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
      "ac": "AC-3",
      "rules": [
        {
          "says": "A number option accepts 0 to 4,294,967,295 unless the template sets other limits, overwrites existing values unless marked soft, and is stored as a number unless marked as text; unreadable attribute values fall back to these defaults.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 199,
            "lastLine": 205
          },
          "doubt": ""
        },
        {
          "says": "A text option allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise; unreadable attribute values fall back to these defaults.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 210,
            "lastLine": 216
          },
          "doubt": ""
        },
        {
          "says": "A list option replaces other entries of its key unless marked additive, stores plain text unless marked expandable, numbers entries automatically unless the template says the person names them, and counts as prefixed only when a value prefix is given.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 217,
            "lastLine": 224
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A policy gets a settings screen layout only when the template names one, the name is written as \"$(presentation.<id>)\", and the language file holds a layout with that id; in every other case the policy has none.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 122,
            "lastLine": 122
          },
          "doubt": ""
        },
        {
          "says": "Only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept in a screen layout; any other control in the language file is dropped without notice.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 106,
            "lastLine": 110
          },
          "doubt": ""
        },
        {
          "says": "A control keeps the reference id the language file gives it, which ties it to the matching setting option in the template file; a control without one has no id.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 107,
            "lastLine": 107
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A number box takes default value 1, shows its up-down spinner and steps by 1 unless the language file says otherwise; an unreadable attribute value falls back to the same defaults.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 54,
            "lastLine": 58
          },
          "doubt": ""
        },
        {
          "says": "A check box starts unticked unless the language file marks it ticked.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 74,
            "lastLine": 74
          },
          "doubt": ""
        },
        {
          "says": "A drop-down list has a preselected item only when the language file names one; otherwise none is preselected.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 94,
            "lastLine": 94
          },
          "doubt": ""
        },
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
    }
  ],
  "reliesOn": [
    {
      "says": "When the chosen language file cannot be parsed as XML, the template is refused with \"The ADML XML couldn't be parsed: <detail>\"; any other read problem gives \"The ADML is invalid: <detail>\".",
      "builtBy": "Find each template and its text in the person's...: Language text reader"
    },
    {
      "says": "A language file's text table is read only from its first text table, and each text is kept under its id; when the same text id appears twice, the file is refused as invalid and its template file is not loaded.",
      "builtBy": "Find each template and its text in the person's...: Language text reader"
    },
    {
      "says": "A language file's screen layouts are read only from its first presentation table; when the same layout id appears twice, the file is refused as invalid and its template file is not loaded.",
      "builtBy": "Find each template and its text in the person's...: Language text reader"
    },
    {
      "says": "When a language file has no policy resources section, or its revision is missing or not a number, the file is refused as invalid and its template file is not loaded.",
      "builtBy": "Find each template and its text in the person's...: Language text reader"
    },
    {
      "says": "A name or description written as \"$(string.<id>)\" shows the language file's text for that id; an unknown id shows the code itself; any other text is shown as written; an empty value stays empty.",
      "builtBy": "Find each template and its text in the person's...: Language text reader"
    },
    {
      "says": "The text of a policy description is tidied for display: leading and trailing spaces are removed from every line and blank space at the end of the text is dropped.",
      "builtBy": "Find each template and its text in the person's...: Language text reader"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Policy option reader",
      "module": "policy-option-reader",
      "layer": "packages/ui"
    }
  ],
  "cited": [
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
      "firstLine": 248,
      "lastLine": 250
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 222,
      "lastLine": 224
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
      "firstLine": 217,
      "lastLine": 224
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 122,
      "lastLine": 122
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 201,
      "lastLine": 207
    },
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
      "firstLine": 107,
      "lastLine": 107
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
      "firstLine": 94,
      "lastLine": 94
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
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A registry value in a template is a delete marker, a number or a text, decided by the first of those it contains; a value with none of them is treated as a delete marker. (PolicyPlus/AdmxFile.vb:115-132)
- An option's registry value name is taken from its own value name, except for a list option that has a value prefix attribute: the prefix is used and the own value name only when that prefix is empty. A list option counts as prefixed whenever the attribute is present, even if empty. (PolicyPlus/AdmxFile.vb:248-250)

### AC-2

- A policy option of any kind other than number, yes/no, text, list, choice or multi-line text is dropped without notice. (PolicyPlus/AdmxFile.vb:244-254)
- A yes/no option takes its registry effect for true and false from true and false values and lists. (PolicyPlus/AdmxFile.vb:206-209)
- A choice option is optional unless marked required. Each choice keeps whichever of a single registry value and a list of values it contains, both when both are present; a choice with neither is accepted and changes nothing. (PolicyPlus/AdmxFile.vb:225-243)

### AC-3

- A number option accepts 0 to 4,294,967,295 unless the template sets other limits, overwrites existing values unless marked soft, and is stored as a number unless marked as text; unreadable attribute values fall back to these defaults. (PolicyPlus/AdmxFile.vb:199-205)
- A text option allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise; unreadable attribute values fall back to these defaults. (PolicyPlus/AdmxFile.vb:210-216)
- A list option replaces other entries of its key unless marked additive, stores plain text unless marked expandable, numbers entries automatically unless the template says the person names them, and counts as prefixed only when a value prefix is given. (PolicyPlus/AdmxFile.vb:217-224)

### AC-4

- A policy gets a settings screen layout only when the template names one, the name is written as "$(presentation.<id>)", and the language file holds a layout with that id; in every other case the policy has none. (PolicyPlus/AdmxBundle.vb:122-122)
- Only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept in a screen layout; any other control in the language file is dropped without notice. (PolicyPlus/AdmlFile.vb:106-110)
- A control keeps the reference id the language file gives it, which ties it to the matching setting option in the template file; a control without one has no id. (PolicyPlus/AdmlFile.vb:107-107)

### AC-5

- A number box takes default value 1, shows its up-down spinner and steps by 1 unless the language file says otherwise; an unreadable attribute value falls back to the same defaults. (PolicyPlus/AdmlFile.vb:54-58)
- A check box starts unticked unless the language file marks it ticked. (PolicyPlus/AdmlFile.vb:74-74)
- A drop-down list has a preselected item only when the language file names one; otherwise none is preselected. (PolicyPlus/AdmlFile.vb:94-94)
- Entries of a combo box or drop-down list are sorted unless the language file says not to sort them. (PolicyPlus/AdmlFile.vb:79-79)

## Relies on, built elsewhere

- When the chosen language file cannot be parsed as XML, the template is refused with "The ADML XML couldn't be parsed: <detail>"; any other read problem gives "The ADML is invalid: <detail>". Built by: Find each template and its text in the person's...: Language text reader.
- A language file's text table is read only from its first text table, and each text is kept under its id; when the same text id appears twice, the file is refused as invalid and its template file is not loaded. Built by: Find each template and its text in the person's...: Language text reader.
- A language file's screen layouts are read only from its first presentation table; when the same layout id appears twice, the file is refused as invalid and its template file is not loaded. Built by: Find each template and its text in the person's...: Language text reader.
- When a language file has no policy resources section, or its revision is missing or not a number, the file is refused as invalid and its template file is not loaded. Built by: Find each template and its text in the person's...: Language text reader.
- A name or description written as "$(string.<id>)" shows the language file's text for that id; an unknown id shows the code itself; any other text is shown as written; an empty value stays empty. Built by: Find each template and its text in the person's...: Language text reader.
- The text of a policy description is tidied for display: leading and trailing spaces are removed from every line and blank space at the end of the text is dropped. Built by: Find each template and its text in the person's...: Language text reader.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
