# Legacy reference: Edit the data of a policy value by its kind

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-e795e0ca691d",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "Editing a value offers a text, number or list-of-text dialog by kind: text kinds (plain and expandable) a text box, 32-bit and 64-bit numbers a number box, lists of text a multi-line box. Any other kind, such as binary, is refused with \"This value kind is not supported.\" and nothing changes. Cancelling the dialog leaves the value as it was.",
          "where": {
            "file": "PolicyPlus/EditPol.vb",
            "firstLine": 130,
            "lastLine": 153
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": []
    },
    {
      "ac": "AC-3",
      "rules": []
    },
    {
      "ac": "AC-4",
      "rules": []
    },
    {
      "ac": "AC-5",
      "rules": []
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "Editing a value replaces its data with the confirmed new data and keeps its name and kind; the value stays selected.",
          "where": {
            "file": "PolicyPlus/EditPol.vb",
            "firstLine": 240,
            "lastLine": 246
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
      "says": "A number entered for a registry value is limited to 0 to 4,294,967,295 for a 32-bit value and to 0 to 18,446,744,073,709,551,615 for a 64-bit value.",
      "builtBy": "Read typed numbers within the 32-bit and 64-bit limits"
    },
    {
      "says": "When a typed hexadecimal number is too large to fit, the value is set to the largest allowed value; text that is not a hexadecimal number leaves the value unchanged.",
      "builtBy": "Read typed numbers within the 32-bit and 64-bit limits"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Value Data Editor",
      "module": "value-data-editor",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/EditPol.vb",
      "firstLine": 130,
      "lastLine": 153
    },
    {
      "file": "PolicyPlus/EditPol.vb",
      "firstLine": 240,
      "lastLine": 246
    }
  ]
}
```

## What each criterion must keep

### AC-1

- Editing a value offers a text, number or list-of-text dialog by kind: text kinds (plain and expandable) a text box, 32-bit and 64-bit numbers a number box, lists of text a multi-line box. Any other kind, such as binary, is refused with "This value kind is not supported." and nothing changes. Cancelling the dialog leaves the value as it was. (PolicyPlus/EditPol.vb:130-153)

### AC-2

No single legacy rule: it describes the behaviour as a whole.


### AC-3

No single legacy rule: it describes the behaviour as a whole.


### AC-4

No single legacy rule: it describes the behaviour as a whole.


### AC-5

No single legacy rule: it describes the behaviour as a whole.


### AC-6

- Editing a value replaces its data with the confirmed new data and keeps its name and kind; the value stays selected. (PolicyPlus/EditPol.vb:240-246)

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
- A number entered for a registry value is limited to 0 to 4,294,967,295 for a 32-bit value and to 0 to 18,446,744,073,709,551,615 for a 64-bit value. Built by: Read typed numbers within the 32-bit and 64-bit limits.
- When a typed hexadecimal number is too large to fit, the value is set to the largest allowed value; text that is not a hexadecimal number leaves the value unchanged. Built by: Read typed numbers within the 32-bit and 64-bit limits.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
