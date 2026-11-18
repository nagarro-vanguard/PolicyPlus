# Legacy reference: Validate template and language files while reading them

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-a6877efa14bb",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A template file is refused as invalid when any of these is missing or unreadable: the policy definitions section; a namespace entry's prefix or namespace; a superseded-ADM file name; a minimum revision (missing or not a number); a support rule's name or display name; a support reference or range without its reference, or a version bound that is not a whole number; a product's name, display name or version index; a category's name or display name; a category's parent entry or its reference when the category has content; a policy's name, display name, key or class; a policy's category or supported-on reference; a number value's value; a list item's value name; a choice item's display name; or an option's id.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 20,
            "lastLine": 33
          },
          "doubt": "The clause 'a policy's category or supported-on reference' can be read as a policy that has no parent-category or supported-on entry. Such a policy is not refused by the file load: the file loads and the failure comes later, when the structures are built (AdmxBundle.vb:153 and 159 read the missing reference), which is the case the build-failure finding states. Only an entry that is present without its reference is refused here (AdmxFile.vb:191, 193). Write it as 'a policy's parent-category or supported-on entry without a reference' so a tester does not expect a refusal for a policy with no entry."
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A template's superseded-ADM file name and minimum language revision are read when present; a superseded entry without a file name, or a minimum revision that is missing or not a number, refuses the template as invalid.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 30,
            "lastLine": 33
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "The namespace of a template is the one listed as its target; each prefix a template declares must be unique, and a repeated prefix refuses the file as invalid.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 24,
            "lastLine": 29
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
      "ac": "AC-6",
      "rules": [
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
      "ac": "AC-7",
      "rules": [
        {
          "says": "An XML attribute that is absent, or whose text is not valid for the type of the stated default, gives that default.",
          "where": {
            "file": "PolicyPlus/XmlExtensions.vb",
            "firstLine": 9,
            "lastLine": 16
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "An item's unique name is its template's namespace, a colon and its own name, so equal names in different templates stay apart.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 209,
            "lastLine": 209
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
      "firstLine": 20,
      "lastLine": 33
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 40,
      "lastLine": 41
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 56,
      "lastLine": 64
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 80,
      "lastLine": 82
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 104,
      "lastLine": 109
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 123,
      "lastLine": 123
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 140,
      "lastLine": 140
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 170,
      "lastLine": 174
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 191,
      "lastLine": 193
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 232,
      "lastLine": 232
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 251,
      "lastLine": 251
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 37,
      "lastLine": 43
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 30,
      "lastLine": 33
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 24,
      "lastLine": 29
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 37,
      "lastLine": 43
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
      "firstLine": 107,
      "lastLine": 107
    },
    {
      "file": "PolicyPlus/XmlExtensions.vb",
      "firstLine": 9,
      "lastLine": 16
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 209,
      "lastLine": 209
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A template file is refused as invalid when any of these is missing or unreadable: the policy definitions section; a namespace entry's prefix or namespace; a superseded-ADM file name; a minimum revision (missing or not a number); a support rule's name or display name; a support reference or range without its reference, or a version bound that is not a whole number; a product's name, display name or version index; a category's name or display name; a category's parent entry or its reference when the category has content; a policy's name, display name, key or class; a policy's category or supported-on reference; a number value's value; a list item's value name; a choice item's display name; or an option's id. (PolicyPlus/AdmxFile.vb:20-33) Doubt: The clause 'a policy's category or supported-on reference' can be read as a policy that has no parent-category or supported-on entry. Such a policy is not refused by the file load: the file loads and the failure comes later, when the structures are built (AdmxBundle.vb:153 and 159 read the missing reference), which is the case the build-failure finding states. Only an entry that is present without its reference is refused here (AdmxFile.vb:191, 193). Write it as 'a policy's parent-category or supported-on entry without a reference' so a tester does not expect a refusal for a policy with no entry.

### AC-2

- A template's superseded-ADM file name and minimum language revision are read when present; a superseded entry without a file name, or a minimum revision that is missing or not a number, refuses the template as invalid. (PolicyPlus/AdmxFile.vb:30-33)

### AC-3

- The namespace of a template is the one listed as its target; each prefix a template declares must be unique, and a repeated prefix refuses the file as invalid. (PolicyPlus/AdmxFile.vb:24-29)

### AC-4

- When a language file has no policy resources section, or its revision is missing or not a number, the file is refused as invalid and its template file is not loaded. (PolicyPlus/AdmlFile.vb:18-19)

### AC-5

- A language file's screen layouts are read only from its first presentation table; when the same layout id appears twice, the file is refused as invalid and its template file is not loaded. (PolicyPlus/AdmlFile.vb:40-46)

### AC-6

- A control keeps the reference id the language file gives it, which ties it to the matching setting option in the template file; a control without one has no id. (PolicyPlus/AdmlFile.vb:107-107)

### AC-7

- An XML attribute that is absent, or whose text is not valid for the type of the stated default, gives that default. (PolicyPlus/XmlExtensions.vb:9-16)

### AC-8

- An item's unique name is its template's namespace, a colon and its own name, so equal names in different templates stay apart. (PolicyPlus/AdmxBundle.vb:209-209)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
