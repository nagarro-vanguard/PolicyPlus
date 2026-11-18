# Legacy reference: Link loaded definitions into categories, products and policies

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-a0702af37a64",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
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
      "ac": "AC-2",
      "rules": [
        {
          "says": "A reference containing a colon uses the namespace the template declared for its prefix; with an unknown prefix it is taken as already complete; a reference without a colon belongs to the template's own namespace.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 213,
            "lastLine": 223
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A category whose parent is named is attached under that parent, found among items of this load or of files loaded earlier; when the parent is not found, the category has no parent but is still listed among the top-level categories.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 128,
            "lastLine": 136
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A support rule entry is linked to the product its reference names; when no such product exists it is linked to the support rule of that name; when neither exists it stays unlinked.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 145,
            "lastLine": 151
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A policy is listed under the category its reference names, found in this load or earlier ones; when that category is not found the policy is kept in the policy list but belongs to no category.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 152,
            "lastLine": 158
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "A policy shows the 'supported on' rule its reference names, found in this load or earlier ones; when none is found it has none.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 159,
            "lastLine": 160
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "A policy gets a settings screen layout only when the template names one, the name is written as \"$(presentation.<id>)\", and the language file holds a layout with that id; in every other case the policy has none.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 122,
            "lastLine": 122
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "When the structures are built, all new categories, products, support rules and policies join the final lists and the staged items are cleared, so loading further files adds to what is already available.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 163,
            "lastLine": 181
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
      "firstLine": 195,
      "lastLine": 199
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 213,
      "lastLine": 223
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 128,
      "lastLine": 136
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 163,
      "lastLine": 166
    },
    {
      "file": "PolicyPlus/DetailCategory.vb",
      "firstLine": 17,
      "lastLine": 18
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 145,
      "lastLine": 151
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 152,
      "lastLine": 158
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 159,
      "lastLine": 160
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
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 163,
      "lastLine": 181
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A name or description written as "$(string.<id>)" shows the language file's text for that id; an unknown id shows the code itself; any other text is shown as written; an empty value stays empty. (PolicyPlus/AdmxBundle.vb:195-199)

### AC-2

- A reference containing a colon uses the namespace the template declared for its prefix; with an unknown prefix it is taken as already complete; a reference without a colon belongs to the template's own namespace. (PolicyPlus/AdmxBundle.vb:213-223)

### AC-3

- A category whose parent is named is attached under that parent, found among items of this load or of files loaded earlier; when the parent is not found, the category has no parent but is still listed among the top-level categories. (PolicyPlus/AdmxBundle.vb:128-136)

### AC-4

- A support rule entry is linked to the product its reference names; when no such product exists it is linked to the support rule of that name; when neither exists it stays unlinked. (PolicyPlus/AdmxBundle.vb:145-151)

### AC-5

- A policy is listed under the category its reference names, found in this load or earlier ones; when that category is not found the policy is kept in the policy list but belongs to no category. (PolicyPlus/AdmxBundle.vb:152-158)

### AC-6

- A policy shows the 'supported on' rule its reference names, found in this load or earlier ones; when none is found it has none. (PolicyPlus/AdmxBundle.vb:159-160)

### AC-7

- A policy gets a settings screen layout only when the template names one, the name is written as "$(presentation.<id>)", and the language file holds a layout with that id; in every other case the policy has none. (PolicyPlus/AdmxBundle.vb:122-122)

### AC-8

- When the structures are built, all new categories, products, support rules and policies join the final lists and the staged items are cleared, so loading further files adds to what is already available. (PolicyPlus/AdmxBundle.vb:163-181)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
