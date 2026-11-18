# Legacy reference: Describe products and support definitions in their detail views

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-97add99ab26c",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The product details window labels a product \"Major revision\", \"Minor revision\" or \"Top-level product\" from its type.",
          "where": {
            "file": "PolicyPlus/DetailProduct.vb",
            "firstLine": 13,
            "lastLine": 20
          },
          "doubt": ""
        },
        {
          "says": "The product details window shows a version number for major and minor revisions only; for a top-level product the version is blank.",
          "where": {
            "file": "PolicyPlus/DetailProduct.vb",
            "firstLine": 21,
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
          "says": "A product with a parent shows the parent name and enables the parent button; a product with no parent shows a blank parent and the button is disabled.",
          "where": {
            "file": "PolicyPlus/DetailProduct.vb",
            "firstLine": 22,
            "lastLine": 28
          },
          "doubt": ""
        },
        {
          "says": "The product details window lists every child revision of a product with its version and name; a product with no children shows an empty list.",
          "where": {
            "file": "PolicyPlus/DetailProduct.vb",
            "firstLine": 29,
            "lastLine": 36
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "The support details window states how a support definition matches products: \"Match all the referenced products\", \"Match any of the referenced products\", or \"Do not match products\" when it has no matching logic.",
          "where": {
            "file": "PolicyPlus/DetailSupport.vb",
            "firstLine": 11,
            "lastLine": 18
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "Each entry of a support definition is listed by the name of the nested support definition when it is one, otherwise by the name of the product, otherwise as \"<missing: \" followed by the product code the entry names. Minimum and maximum versions are listed only for product entries that name a version range; a missing bound is shown blank.",
          "where": {
            "file": "PolicyPlus/DetailSupport.vb",
            "firstLine": 20,
            "lastLine": 36
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
      "file": "PolicyPlus/DetailProduct.vb",
      "firstLine": 13,
      "lastLine": 20
    },
    {
      "file": "PolicyPlus/DetailProduct.vb",
      "firstLine": 21,
      "lastLine": 21
    },
    {
      "file": "PolicyPlus/DetailProduct.vb",
      "firstLine": 22,
      "lastLine": 28
    },
    {
      "file": "PolicyPlus/DetailProduct.vb",
      "firstLine": 29,
      "lastLine": 36
    },
    {
      "file": "PolicyPlus/DetailSupport.vb",
      "firstLine": 11,
      "lastLine": 18
    },
    {
      "file": "PolicyPlus/DetailSupport.vb",
      "firstLine": 20,
      "lastLine": 36
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The product details window labels a product "Major revision", "Minor revision" or "Top-level product" from its type. (PolicyPlus/DetailProduct.vb:13-20)
- The product details window shows a version number for major and minor revisions only; for a top-level product the version is blank. (PolicyPlus/DetailProduct.vb:21-21)

### AC-2

- A product with a parent shows the parent name and enables the parent button; a product with no parent shows a blank parent and the button is disabled. (PolicyPlus/DetailProduct.vb:22-28)
- The product details window lists every child revision of a product with its version and name; a product with no children shows an empty list. (PolicyPlus/DetailProduct.vb:29-36)

### AC-3

- The support details window states how a support definition matches products: "Match all the referenced products", "Match any of the referenced products", or "Do not match products" when it has no matching logic. (PolicyPlus/DetailSupport.vb:11-18)

### AC-4

- Each entry of a support definition is listed by the name of the nested support definition when it is one, otherwise by the name of the product, otherwise as "<missing: " followed by the product code the entry names. Minimum and maximum versions are listed only for product entries that name a version range; a missing bound is shown blank. (PolicyPlus/DetailSupport.vb:20-36)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
