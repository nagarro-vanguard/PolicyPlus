# Legacy reference: Find each template and its text in the person's...: Language text reader

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-7f35e91a790a",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "When the chosen language file cannot be parsed as XML, the template is refused with \"The ADML XML couldn't be parsed: <detail>\"; any other read problem gives \"The ADML is invalid: <detail>\".",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 64,
            "lastLine": 70
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A language file's text table is read only from its first text table, and each text is kept under its id; when the same text id appears twice, the file is refused as invalid and its template file is not loaded.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 29,
            "lastLine": 37
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A language file's screen layouts are read only from its first presentation table; when the same layout id appears twice, the file is refused as invalid and its template file is not loaded.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 40,
            "lastLine": 46
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "When a language file has no policy resources section, or its revision is missing or not a number, the file is refused as invalid and its template file is not loaded.",
          "where": {
            "file": "PolicyPlus/AdmlFile.vb",
            "firstLine": 18,
            "lastLine": 19
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A name or description written as \"$(string.<id>)\" shows the language file's text for that id; an unknown id shows the code itself; any other text is shown as written; an empty value stays empty.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 195,
            "lastLine": 199
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "The text of a policy description is tidied for display: leading and trailing spaces are removed from every line and blank space at the end of the text is dropped.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 863,
            "lastLine": 870
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
  "steps": [],
  "components": [
    {
      "name": "Language text reader",
      "module": "language-text-reader",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 64,
      "lastLine": 70
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 264,
      "lastLine": 267
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 29,
      "lastLine": 37
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 64,
      "lastLine": 70
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 40,
      "lastLine": 46
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 112,
      "lastLine": 112
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 64,
      "lastLine": 70
    },
    {
      "file": "PolicyPlus/AdmlFile.vb",
      "firstLine": 18,
      "lastLine": 19
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 64,
      "lastLine": 70
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 195,
      "lastLine": 199
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 863,
      "lastLine": 870
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When the chosen language file cannot be parsed as XML, the template is refused with "The ADML XML couldn't be parsed: <detail>"; any other read problem gives "The ADML is invalid: <detail>". (PolicyPlus/AdmxBundle.vb:64-70)

### AC-2

- A language file's text table is read only from its first text table, and each text is kept under its id; when the same text id appears twice, the file is refused as invalid and its template file is not loaded. (PolicyPlus/AdmlFile.vb:29-37)

### AC-3

- A language file's screen layouts are read only from its first presentation table; when the same layout id appears twice, the file is refused as invalid and its template file is not loaded. (PolicyPlus/AdmlFile.vb:40-46)

### AC-4

- When a language file has no policy resources section, or its revision is missing or not a number, the file is refused as invalid and its template file is not loaded. (PolicyPlus/AdmlFile.vb:18-19)

### AC-5

- A name or description written as "$(string.<id>)" shows the language file's text for that id; an unknown id shows the code itself; any other text is shown as written; an empty value stays empty. (PolicyPlus/AdmxBundle.vb:195-199)

### AC-6

- The text of a policy description is tidied for display: leading and trailing spaces are removed from every line and blank space at the end of the text is dropped. (PolicyPlus/Main.vb:863-870)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
