# Legacy reference: Load policy templates from an uploaded package with the right language

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-036b775c5bc8",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "Only files directly in the chosen folder whose names end in .admx (in any letter case) are loaded as templates; subfolders and other files are ignored.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 20,
            "lastLine": 21
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "The language file for a template is taken from the subfolder named exactly by the language code if it holds this template's file; else from the first subfolder whose name starts with the same language part (before the dash, compared with capital letters mattering) that holds this template's file; else from the en-US subfolder if it holds it. A folder lacking the file is skipped.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 46,
            "lastLine": 61
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "When no language file is found in any of those places, the template file is refused with \"The corresponding ADML is missing\" and none of its content is loaded.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 62,
            "lastLine": 62
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "When a template file's namespace is already held by a template file loaded earlier, it is refused with \"The <namespace> namespace is already owned by a different ADMX file\", so the same file cannot be added twice.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 44,
            "lastLine": 44
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When a template file is refused with a reported failure (unparsable, invalid, namespace already owned, or no usable language file), it is skipped and the failure is listed; the other files in the folder still load and the structures are built from those that loaded.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 22,
            "lastLine": 26
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "When both a template file and its language file load, the template's categories, products, support rules and policies are staged for the next build and the pair is recorded as loaded under the template's namespace.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 72,
            "lastLine": 77
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "The language for definition text is the saved language code, or the computer's own language when none is saved.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 478,
            "lastLine": 478
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "Closing the workspace or replacing it with a new one discards all loaded definitions and the previous search results.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 391,
            "lastLine": 392
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
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 20,
      "lastLine": 21
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 46,
      "lastLine": 61
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 49,
      "lastLine": 59
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 62,
      "lastLine": 62
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 262,
      "lastLine": 263
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 44,
      "lastLine": 44
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 268,
      "lastLine": 269
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 77,
      "lastLine": 77
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 22,
      "lastLine": 26
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 27,
      "lastLine": 27
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 72,
      "lastLine": 77
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 478,
      "lastLine": 478
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 391,
      "lastLine": 392
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 540,
      "lastLine": 541
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 760,
      "lastLine": 760
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 811,
      "lastLine": 811
    }
  ]
}
```

## What each criterion must keep

### AC-1

- Only files directly in the chosen folder whose names end in .admx (in any letter case) are loaded as templates; subfolders and other files are ignored. (PolicyPlus/AdmxBundle.vb:20-21)

### AC-2

- The language file for a template is taken from the subfolder named exactly by the language code if it holds this template's file; else from the first subfolder whose name starts with the same language part (before the dash, compared with capital letters mattering) that holds this template's file; else from the en-US subfolder if it holds it. A folder lacking the file is skipped. (PolicyPlus/AdmxBundle.vb:46-61)

### AC-3

- When no language file is found in any of those places, the template file is refused with "The corresponding ADML is missing" and none of its content is loaded. (PolicyPlus/AdmxBundle.vb:62-62)

### AC-4

- When a template file's namespace is already held by a template file loaded earlier, it is refused with "The <namespace> namespace is already owned by a different ADMX file", so the same file cannot be added twice. (PolicyPlus/AdmxBundle.vb:44-44)

### AC-5

- When a template file is refused with a reported failure (unparsable, invalid, namespace already owned, or no usable language file), it is skipped and the failure is listed; the other files in the folder still load and the structures are built from those that loaded. (PolicyPlus/AdmxBundle.vb:22-26)

### AC-6

- When both a template file and its language file load, the template's categories, products, support rules and policies are staged for the next build and the pair is recorded as loaded under the template's namespace. (PolicyPlus/AdmxBundle.vb:72-77)

### AC-7

- The language for definition text is the saved language code, or the computer's own language when none is saved. (PolicyPlus/Main.vb:478-478)

### AC-8

- Closing the workspace or replacing it with a new one discards all loaded definitions and the previous search results. (PolicyPlus/Main.vb:391-392)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
