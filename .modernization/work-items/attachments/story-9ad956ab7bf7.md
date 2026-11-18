# Legacy reference: Read support rules, products, classes and list options from templates

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-9ad956ab7bf7",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A support rule is 'any of' when its first logic element is \"or\", 'all of' when it is \"and\", and blank otherwise; only that first logic element is read, each reference or range in it becomes an entry, and a range may carry a minimum and maximum version.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 42,
            "lastLine": 69
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A child product (major or minor version) is attached under its parent product, which must be defined in the same template file; only products without a parent are listed as top-level products.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 137,
            "lastLine": 143
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A policy applies to computers when its class is \"Machine\", to users when \"User\", and to both for any other class value.",
          "where": {
            "file": "PolicyPlus/AdmxFile.vb",
            "firstLine": 174,
            "lastLine": 182
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A policy applies to an area when its definition declares that area; a policy declared for both applies to each.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 438,
            "lastLine": 438
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
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
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "cited": [
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 42,
      "lastLine": 69
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 137,
      "lastLine": 143
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 167,
      "lastLine": 170
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 174,
      "lastLine": 182
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 438,
      "lastLine": 438
    },
    {
      "file": "PolicyPlus/AdmxFile.vb",
      "firstLine": 217,
      "lastLine": 224
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A support rule is 'any of' when its first logic element is "or", 'all of' when it is "and", and blank otherwise; only that first logic element is read, each reference or range in it becomes an entry, and a range may carry a minimum and maximum version. (PolicyPlus/AdmxFile.vb:42-69)

### AC-2

- A child product (major or minor version) is attached under its parent product, which must be defined in the same template file; only products without a parent are listed as top-level products. (PolicyPlus/AdmxBundle.vb:137-143)

### AC-3

- A policy applies to computers when its class is "Machine", to users when "User", and to both for any other class value. (PolicyPlus/AdmxFile.vb:174-182)

### AC-4

- A policy applies to an area when its definition declares that area; a policy declared for both applies to each. (PolicyPlus/Main.vb:438-438)

### AC-5

- A list option replaces other entries of its key unless marked additive, stores plain text unless marked expandable, numbers entries automatically unless the template says the person names them, and counts as prefixed only when a value prefix is given. (PolicyPlus/AdmxFile.vb:217-224)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
