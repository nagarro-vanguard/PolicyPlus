# Legacy reference: Show the category tree and the list of a chosen category

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-be2ca86e91a5",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A category is orphaned when it has no parent among the loaded definitions although its definition names one.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 171,
            "lastLine": 171
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A category is empty when it holds no subcategories and no policies at all, counting hidden ones.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 174,
            "lastLine": 174
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A category's icon is chosen in this order: orphaned, then empty, then normal.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 177,
            "lastLine": 183
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A category is visible when empty categories are switched on. Otherwise it is visible only if it has at least one visible policy or one visible subcategory.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 196,
            "lastLine": 200
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A policy is visible only if it applies to a chosen area (user, computer or both). With \"Only Filtered Policies\" on, it must also pass the filter for a chosen area it applies to; passing for either one is enough.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 204,
            "lastLine": 215
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "A category appears in the tree only when it passes the visibility rule; each shown category gets an icon by its kind and carries its visible subcategories below it, and the tree is sorted.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 90,
            "lastLine": 95
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "The category tree selection follows the category shown in the right pane.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 139,
            "lastLine": 141
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "The right pane lists the chosen category in this order: an \"Up: <parent name>\" row marked \"Parent\" when the category has a parent, then visible subcategories by name, then visible policies by name. Each policy row shows its state and its comment text.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 113,
            "lastLine": 129
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "When nothing is selected, the title and support lines are hidden and the pane reads \"Select an item to see its description.\".",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 146,
            "lastLine": 148
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
      "file": "PolicyPlus/Main.vb",
      "firstLine": 171,
      "lastLine": 171
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 174,
      "lastLine": 174
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 177,
      "lastLine": 183
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 196,
      "lastLine": 200
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 204,
      "lastLine": 215
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 436,
      "lastLine": 439
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 90,
      "lastLine": 95
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 98,
      "lastLine": 99
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 139,
      "lastLine": 141
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 113,
      "lastLine": 129
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 116,
      "lastLine": 117
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 146,
      "lastLine": 148
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 164,
      "lastLine": 167
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A category is orphaned when it has no parent among the loaded definitions although its definition names one. (PolicyPlus/Main.vb:171-171)

### AC-2

- A category is empty when it holds no subcategories and no policies at all, counting hidden ones. (PolicyPlus/Main.vb:174-174)

### AC-3

- A category's icon is chosen in this order: orphaned, then empty, then normal. (PolicyPlus/Main.vb:177-183)

### AC-4

- A category is visible when empty categories are switched on. Otherwise it is visible only if it has at least one visible policy or one visible subcategory. (PolicyPlus/Main.vb:196-200)

### AC-5

- A policy is visible only if it applies to a chosen area (user, computer or both). With "Only Filtered Policies" on, it must also pass the filter for a chosen area it applies to; passing for either one is enough. (PolicyPlus/Main.vb:204-215)

### AC-6

- A category appears in the tree only when it passes the visibility rule; each shown category gets an icon by its kind and carries its visible subcategories below it, and the tree is sorted. (PolicyPlus/Main.vb:90-95)

### AC-7

- The category tree selection follows the category shown in the right pane. (PolicyPlus/Main.vb:139-141)

### AC-8

- The right pane lists the chosen category in this order: an "Up: <parent name>" row marked "Parent" when the category has a parent, then visible subcategories by name, then visible policies by name. Each policy row shows its state and its comment text. (PolicyPlus/Main.vb:113-129)

### AC-9

- When nothing is selected, the title and support lines are hidden and the pane reads "Select an item to see its description.". (PolicyPlus/Main.vb:146-148)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
