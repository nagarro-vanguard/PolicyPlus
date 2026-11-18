# Legacy reference: Show policy settings as semantic policy text with or without a heading

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-5e36d175c14c",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The fragment text starts with the heading \"Policy Plus Semantic Policy\" and a blank line only when \"Include SPOL header\" is ticked; otherwise only the fragment is shown.",
          "where": {
            "file": "PolicyPlus/InspectSpolFragment.vb",
            "firstLine": 37,
            "lastLine": 43
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "For a policy's list elements, a marked-for-deletion list counts as one deleted element, and a list that holds any values counts as a present element and cancels that deletion.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "A policy's lists of on-values and off-values count as enabled or disabled evidence for each value in them that is present, using the list's own key when it names one.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "For any other element (number, text, choice, multi-line text), a value marked for deletion counts as a deleted element and a value that is present counts as a present element.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "A policy with a registry value of its own counts as enabled evidence when that value holds its 'on' value, which is the number 1 when the template gives none, and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "If any element is present, the elements add their count to the enabled evidence; only when none is present do deleted elements add to the disabled evidence.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "A policy's state in one area reads \"Enabled\", \"Disabled\", \"Not Configured\" or \"Unknown\"; the computer source is read for the computer area and the user source for any other.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "For a checkbox element: a value marked for deletion counts as one deleted element. Otherwise, each present off value (or off-list value) counts a tenth of a deleted element, and each present on value (or on-list value) counts one present element. A checkbox whose template declares no on value or on list adds no present evidence, even if it holds 1.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "A policy is Enabled when enabled evidence exceeds disabled evidence, Disabled when disabled exceeds enabled, Not configured when there is no evidence either way, and Unclear when both are equal and above zero.",
      "builtBy": "Settle each policy's state from the evidence in its source"
    },
    {
      "says": "A choice element is read as the position of the first item whose own value is present and, when the item has a value list, whose list is wholly present; when no item matches, the position is -1.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "A list element whose entries have names the person provides is read as every stored name with its value, under the element's key.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "A list of values counts as present only when every value in it is present.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "A checkbox is on when its on value (or all values of its on list) is present, or, with neither defined, when its value is 1; it is off in every other case, including when its off value is present.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "A list element whose entry names do not matter is read as a list of values: when the list has a prefix, the stored values named prefix1, prefix2, and so on, in order, until the first number that is missing; otherwise every stored value name under the key.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "The saved value of a multi-line text element is read as stored, without first checking that it exists.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "The saved value of a number or text element is read as stored; the reading assumes the value exists and is of the right kind, and is not checked first. A checkbox is read by its own rule.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "The Semantic Policy fragment shows one section per area the policy applies to: the machine section reads the computer source and its comments, the user section reads the user source and its comments; an area the policy does not cover is left out.",
      "builtBy": "Show a policy's semantic text on request"
    },
    {
      "says": "In semantic policy text, a whole number is written with a leading #, an unsigned number as digits, and a yes/no value as True or False. Text is written between single quotes with no escaping, so text holding a quote or line break cannot be read back. An empty list is written as 'None'. A list of text is written in brackets, one double-quoted item per line with quotes doubled. A table is written in brackets as double-quoted name: value lines.",
      "builtBy": "Show a policy's semantic text on request"
    },
    {
      "says": "When a policy is written as semantic policy text, its settings are listed only if the policy is Enabled.",
      "builtBy": "Show a policy's semantic text on request"
    },
    {
      "says": "Within each section of the fragment, the policy comment is included only when one is stored for that policy, and the option values are included only when the policy is Enabled.",
      "builtBy": "Show a policy's semantic text on request"
    },
    {
      "says": "When a policy is written as semantic policy text, backslashes in its comment are doubled and each carriage return plus line feed pair is written as '\\n'. A lone line feed or lone carriage return is written as it is, which splits the comment over two script lines and corrupts it when read back.",
      "builtBy": "Show a policy's semantic text on request"
    },
    {
      "says": "A semantic policy text line shows 'C' for a machine policy and 'U' for a user policy, followed by the identifier.",
      "builtBy": "Show a policy's semantic text on request"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Semantic Text Writer",
      "module": "semantic-text-writer",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/InspectSpolFragment.vb",
      "firstLine": 37,
      "lastLine": 43
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The fragment text starts with the heading "Policy Plus Semantic Policy" and a blank line only when "Include SPOL header" is ticked; otherwise only the fragment is shown. (PolicyPlus/InspectSpolFragment.vb:37-43)

## Relies on, built elsewhere

- For a policy's list elements, a marked-for-deletion list counts as one deleted element, and a list that holds any values counts as a present element and cancels that deletion. Built by: Settle each policy's state from the evidence in its source.
- A policy's lists of on-values and off-values count as enabled or disabled evidence for each value in them that is present, using the list's own key when it names one. Built by: Settle each policy's state from the evidence in its source.
- A policy's switched-on and switched-off effects are read from its enabled and disabled values and lists; a list entry names a value and optionally its own key, falling back to the list's default key. Built by: Settle each policy's state from the evidence in its source.
- For any other element (number, text, choice, multi-line text), a value marked for deletion counts as a deleted element and a value that is present counts as a present element. Built by: Settle each policy's state from the evidence in its source.
- A policy with a registry value of its own counts as enabled evidence when that value holds its 'on' value, which is the number 1 when the template gives none, and as disabled evidence when it holds its 'off' value or is marked for deletion when the template gives none. Built by: Settle each policy's state from the evidence in its source.
- If any element is present, the elements add their count to the enabled evidence; only when none is present do deleted elements add to the disabled evidence. Built by: Settle each policy's state from the evidence in its source.
- A policy's state in one area reads "Enabled", "Disabled", "Not Configured" or "Unknown"; the computer source is read for the computer area and the user source for any other. Built by: Settle each policy's state from the evidence in its source.
- For a checkbox element: a value marked for deletion counts as one deleted element. Otherwise, each present off value (or off-list value) counts a tenth of a deleted element, and each present on value (or on-list value) counts one present element. A checkbox whose template declares no on value or on list adds no present evidence, even if it holds 1. Built by: Settle each policy's state from the evidence in its source.
- A policy is Enabled when enabled evidence exceeds disabled evidence, Disabled when disabled exceeds enabled, Not configured when there is no evidence either way, and Unclear when both are equal and above zero. Built by: Settle each policy's state from the evidence in its source.
- A choice element is read as the position of the first item whose own value is present and, when the item has a value list, whose list is wholly present; when no item matches, the position is -1. Built by: Show each option's stored value and save it in the right form.
- A list element whose entries have names the person provides is read as every stored name with its value, under the element's key. Built by: Show each option's stored value and save it in the right form.
- A list of values counts as present only when every value in it is present. Built by: Show each option's stored value and save it in the right form.
- A checkbox is on when its on value (or all values of its on list) is present, or, with neither defined, when its value is 1; it is off in every other case, including when its off value is present. Built by: Show each option's stored value and save it in the right form.
- A list element whose entry names do not matter is read as a list of values: when the list has a prefix, the stored values named prefix1, prefix2, and so on, in order, until the first number that is missing; otherwise every stored value name under the key. Built by: Show each option's stored value and save it in the right form.
- The saved value of a multi-line text element is read as stored, without first checking that it exists. Built by: Show each option's stored value and save it in the right form.
- The saved value of a number or text element is read as stored; the reading assumes the value exists and is of the right kind, and is not checked first. A checkbox is read by its own rule. Built by: Show each option's stored value and save it in the right form.
- The Semantic Policy fragment shows one section per area the policy applies to: the machine section reads the computer source and its comments, the user section reads the user source and its comments; an area the policy does not cover is left out. Built by: Show a policy's semantic text on request.
- In semantic policy text, a whole number is written with a leading #, an unsigned number as digits, and a yes/no value as True or False. Text is written between single quotes with no escaping, so text holding a quote or line break cannot be read back. An empty list is written as 'None'. A list of text is written in brackets, one double-quoted item per line with quotes doubled. A table is written in brackets as double-quoted name: value lines. Built by: Show a policy's semantic text on request.
- When a policy is written as semantic policy text, its settings are listed only if the policy is Enabled. Built by: Show a policy's semantic text on request.
- Within each section of the fragment, the policy comment is included only when one is stored for that policy, and the option values are included only when the policy is Enabled. Built by: Show a policy's semantic text on request.
- When a policy is written as semantic policy text, backslashes in its comment are doubled and each carriage return plus line feed pair is written as '\n'. A lone line feed or lone carriage return is written as it is, which splits the comment over two script lines and corrupts it when read back. Built by: Show a policy's semantic text on request.
- A semantic policy text line shows 'C' for a machine policy and 'U' for a user policy, followed by the identifier. Built by: Show a policy's semantic text on request.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
