# Legacy reference: Clear a policy's old settings and write its chosen state

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-f14810c65ca2",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The registry values a policy touches are its own value, those in its value lists, those of its elements (the whole key for list elements) and those of checkbox and choice sub-lists, each counted once.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 213,
            "lastLine": 257
          },
          "doubt": ""
        },
        {
          "says": "When a policy is forgotten, the whole key of each of its list elements is cleared and every registry value it touches is dropped from the source, so it reads as Not configured.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 249,
            "lastLine": 262
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "When a key's clearance is forgotten in a REG file, the key-removal entry is dropped if it exists. The request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 254,
            "lastLine": 259
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "When a key's clearance is forgotten in a policy file, every clear-all marker for that key is removed.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 190,
            "lastLine": 195
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "When a policy is set to Enabled, its own on value is saved and any extra values listed for the on state are saved with it. A key left blank in a list falls back to the policy's key.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 300,
            "lastLine": 300
          },
          "doubt": ""
        },
        {
          "says": "When a policy is set to Enabled and the policy has a registry value name but defines no explicit on value, the value is saved as the number 1.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 299,
            "lastLine": 299
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "When Enabled is chosen, applying writes every option of the policy whatever its value, including options never filled in.",
          "where": {
            "file": "PolicyPlus/EditSetting.vb",
            "firstLine": 246,
            "lastLine": 270
          },
          "doubt": "'Writes every option whatever its value, including options never filled in' overreaches: a drop-down option with no choice is not written, line 264 fails and the apply stops (fact-21033848734857416942), and an unopened list option is written with no list (fact-56821189303055742863). Say that every option is read and written whatever its value, except that an unchosen drop-down stops the apply."
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "When a policy is set to Enabled, only the settings the person supplied are written. A setting with no supplied value is left as it was.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 301,
            "lastLine": 305
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "When a policy is set to Disabled and the definition gives no off value, its registry value is removed. A defined off value, with any extra off values, is saved instead.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 358,
            "lastLine": 359
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "When a policy is set to Disabled, each setting gets only its own removal. A list setting has all values under its key removed, even when its definition says to keep other entries. A checkbox with a defined off value or off list gets those saved, and every other setting has its single value removed. Extra values listed for a chosen item, a checkbox's on list and the policy's own on list are left in place.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 360,
            "lastLine": 377
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "When a policy is set to Not configured or Unknown, SetPolicyState writes and removes nothing. Callers forget the policy's old values first, so Not configured works by that removal alone.",
          "where": {
            "file": "PolicyPlus/PolicyProcessing.vb",
            "firstLine": 296,
            "lastLine": 298
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "Reading a value from a policy file gives nothing when the value is absent or marked for deletion.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "A value in a policy file counts as present only if it is stored and not marked for deletion.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. A value of the wrong kind is not present.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored.",
      "builtBy": "Hold a policy file's settings in memory and answer questions about them"
    },
    {
      "says": "When a number setting is saved, it is written as text if the definition says to store it as text, otherwise as a 32-bit number.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "When a list setting is saved, entries that carry their own names are saved under those names. Otherwise each entry is numbered from 1, named with the definition's prefix plus its number, or named after its own text when the definition has no prefix.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "A setting that names its own registry key is saved under that key. Otherwise it is saved under the policy's key.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "When a multi-line text setting is saved, it is written as a multiple-string value.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "When a text setting is saved, it is written as an expandable text string if the definition says so, otherwise as a plain text string.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "When a checkbox setting is saved, a ticked box with no defined on value first saves the number 1, and an unticked box with no defined off value first removes the value. The defined on or off value is then saved, with the extra values listed for that state, and overwrites the first step.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "When a list setting is saved and the definition does not say to keep other entries, every existing value under the list's key is removed first. A list with no supplied entries then stays empty.",
      "builtBy": "Show each option's stored value and save it in the right form"
    },
    {
      "says": "When a registry value is written for a policy, a value defined as 'delete' is removed, a numeric value is saved as a 32-bit number and a text value as a text string. A policy with no value defined writes nothing.",
      "builtBy": "Show each option's stored value and save it in the right form"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [
    {
      "intent": "Review the forecast of changes",
      "change": "new",
      "reason": "Showing the effect before it happens is new and prevents unintended writes."
    }
  ],
  "components": [
    {
      "name": "Policy Forgetter",
      "module": "policy-forgetter",
      "layer": "packages/ui"
    },
    {
      "name": "Policy State Writer",
      "module": "policy-state-writer",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 213,
      "lastLine": 257
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 207,
      "lastLine": 209
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 249,
      "lastLine": 262
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 210,
      "lastLine": 212
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 254,
      "lastLine": 259
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 190,
      "lastLine": 195
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 300,
      "lastLine": 300
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 267,
      "lastLine": 295
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 299,
      "lastLine": 299
    },
    {
      "file": "PolicyPlus/EditSetting.vb",
      "firstLine": 246,
      "lastLine": 270
    },
    {
      "file": "PolicyPlus/EditSetting.vb",
      "firstLine": 243,
      "lastLine": 245
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 301,
      "lastLine": 305
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 358,
      "lastLine": 359
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 360,
      "lastLine": 377
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 347,
      "lastLine": 351
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 367,
      "lastLine": 372
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 296,
      "lastLine": 298
    },
    {
      "file": "PolicyPlus/PolicyProcessing.vb",
      "firstLine": 357,
      "lastLine": 378
    },
    {
      "file": "PolicyPlus/EditSetting.vb",
      "firstLine": 242,
      "lastLine": 242
    },
    {
      "file": "PolicyPlus/SpolFile.vb",
      "firstLine": 212,
      "lastLine": 213
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The registry values a policy touches are its own value, those in its value lists, those of its elements (the whole key for list elements) and those of checkbox and choice sub-lists, each counted once. (PolicyPlus/PolicyProcessing.vb:213-257)
- When a policy is forgotten, the whole key of each of its list elements is cleared and every registry value it touches is dropped from the source, so it reads as Not configured. (PolicyPlus/PolicyProcessing.vb:249-262)

### AC-2

- When a key's clearance is forgotten in a REG file, the key-removal entry is dropped if it exists. The request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted. (PolicyPlus/RegFile.vb:254-259)

### AC-3

- When a key's clearance is forgotten in a policy file, every clear-all marker for that key is removed. (PolicyPlus/PolicySource.vb:190-195)

### AC-4

- When a policy is set to Enabled, its own on value is saved and any extra values listed for the on state are saved with it. A key left blank in a list falls back to the policy's key. (PolicyPlus/PolicyProcessing.vb:300-300)
- When a policy is set to Enabled and the policy has a registry value name but defines no explicit on value, the value is saved as the number 1. (PolicyPlus/PolicyProcessing.vb:299-299)

### AC-5

- When Enabled is chosen, applying writes every option of the policy whatever its value, including options never filled in. (PolicyPlus/EditSetting.vb:246-270) Doubt: 'Writes every option whatever its value, including options never filled in' overreaches: a drop-down option with no choice is not written, line 264 fails and the apply stops (fact-21033848734857416942), and an unopened list option is written with no list (fact-56821189303055742863). Say that every option is read and written whatever its value, except that an unchosen drop-down stops the apply.

### AC-6

- When a policy is set to Enabled, only the settings the person supplied are written. A setting with no supplied value is left as it was. (PolicyPlus/PolicyProcessing.vb:301-305)

### AC-7

- When a policy is set to Disabled and the definition gives no off value, its registry value is removed. A defined off value, with any extra off values, is saved instead. (PolicyPlus/PolicyProcessing.vb:358-359)

### AC-8

- When a policy is set to Disabled, each setting gets only its own removal. A list setting has all values under its key removed, even when its definition says to keep other entries. A checkbox with a defined off value or off list gets those saved, and every other setting has its single value removed. Extra values listed for a chosen item, a checkbox's on list and the policy's own on list are left in place. (PolicyPlus/PolicyProcessing.vb:360-377)

### AC-9

- When a policy is set to Not configured or Unknown, SetPolicyState writes and removes nothing. Callers forget the policy's old values first, so Not configured works by that removal alone. (PolicyPlus/PolicyProcessing.vb:296-298)

## Relies on, built elsewhere

- A value in a policy file counts as marked for deletion when a deletion marker names it, when the key has a clear-all marker, or when a delete-values list for the key names it, regardless of case. Entries are examined in sorted order, and a value whose name sorts after the marker is stored as present and cancels the deletion, whenever it was written and whichever marker kind came before. Built by: Hold a policy file's settings in memory and answer questions about them.
- Listing the values of a key in a policy file leaves out the marker entries unless the caller asks for them. Built by: Hold a policy file's settings in memory and answer questions about them.
- Reading a value from a policy file gives nothing when the value is absent or marked for deletion. Built by: Hold a policy file's settings in memory and answer questions about them.
- A value in a policy file counts as present only if it is stored and not marked for deletion. Built by: Hold a policy file's settings in memory and answer questions about them.
- A value counts as present when: for a deletion marker, it is marked for deletion; for a number, it exists as a whole number and equals the expected number; for text, it exists as text and equals the expected text. A value of the wrong kind is not present. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a value is marked for deletion in a policy file, any value or marker already held under that name is dropped first. A deletion marker holding the number 32, as Microsoft does, is added unless the value is already marked or its key is cleared. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a value is set in a policy file, it replaces any value already held under that name. A deletion marker for the name is not removed. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a value is forgotten in a policy file, both the value and its deletion marker are removed, so the policy reverts to not saying anything about it. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a policy file is clearing a key, all values and markers under the key are dropped and a single clear-all marker is stored. Built by: Hold a policy file's settings in memory and answer questions about them.
- When a number setting is saved, it is written as text if the definition says to store it as text, otherwise as a 32-bit number. Built by: Show each option's stored value and save it in the right form.
- When a list setting is saved, entries that carry their own names are saved under those names. Otherwise each entry is numbered from 1, named with the definition's prefix plus its number, or named after its own text when the definition has no prefix. Built by: Show each option's stored value and save it in the right form.
- A setting that names its own registry key is saved under that key. Otherwise it is saved under the policy's key. Built by: Show each option's stored value and save it in the right form.
- When a multi-line text setting is saved, it is written as a multiple-string value. Built by: Show each option's stored value and save it in the right form.
- When a text setting is saved, it is written as an expandable text string if the definition says so, otherwise as a plain text string. Built by: Show each option's stored value and save it in the right form.
- When a checkbox setting is saved, a ticked box with no defined on value first saves the number 1, and an unticked box with no defined off value first removes the value. The defined on or off value is then saved, with the extra values listed for that state, and overwrites the first step. Built by: Show each option's stored value and save it in the right form.
- When a list setting is saved and the definition does not say to keep other entries, every existing value under the list's key is removed first. A list with no supplied entries then stays empty. Built by: Show each option's stored value and save it in the right form.
- When a registry value is written for a policy, a value defined as 'delete' is removed, a numeric value is saved as a 32-bit number and a text value as a text string. A policy with no value defined writes nothing. Built by: Show each option's stored value and save it in the right form.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
