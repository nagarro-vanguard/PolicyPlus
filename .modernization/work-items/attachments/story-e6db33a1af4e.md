# Legacy reference: Provide an empty scratch source and policy files on the machine

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-e6db33a1af4e",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A Scratch space source is an empty policy store that can be changed but is never saved anywhere.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 80,
            "lastLine": 81
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "When the Registry.pol of a POL file source, the local Group Policy or a per-user Group Policy does not exist, it is created empty with its folder and treated as writable; a mistyped SID therefore creates a new folder and empty file under the per-user policy folder. If creation fails, an empty read-only source is used and no error is shown.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 93,
            "lastLine": 105
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A source read through the file branch covers a POL file, the local Group Policy and a per-user Group Policy, each with a Registry.pol path. An existing file is loaded; it is writable only when it can be opened for reading and writing, otherwise it can be viewed but not committed.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 83,
            "lastLine": 92
          },
          "doubt": "The reach is now right, but 'each with a Registry.pol path' is false for a POL file source: its path is whatever file the person typed or browsed to (line 39, OpenPol.vb browse filter is *.pol), not a Registry.pol; only the local and per-user Group Policy have a Registry.pol path (lines 18, 41). Say: a POL file at the path given, the local Group Policy and a per-user Group Policy at their Registry.pol."
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
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Scratch Policy Store",
      "module": "scratch-policy-store",
      "layer": "packages/ui"
    },
    {
      "name": "Computer File Access",
      "module": "computer-file-access",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 80,
      "lastLine": 81
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 93,
      "lastLine": 105
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 16,
      "lastLine": 19
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 40,
      "lastLine": 47
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 83,
      "lastLine": 92
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 16,
      "lastLine": 19
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 40,
      "lastLine": 47
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A Scratch space source is an empty policy store that can be changed but is never saved anywhere. (PolicyPlus/PolicyLoader.vb:80-81)

### AC-2

- When the Registry.pol of a POL file source, the local Group Policy or a per-user Group Policy does not exist, it is created empty with its folder and treated as writable; a mistyped SID therefore creates a new folder and empty file under the per-user policy folder. If creation fails, an empty read-only source is used and no error is shown. (PolicyPlus/PolicyLoader.vb:93-105)

### AC-3

- A source read through the file branch covers a POL file, the local Group Policy and a per-user Group Policy, each with a Registry.pol path. An existing file is loaded; it is writable only when it can be opened for reading and writing, otherwise it can be viewed but not committed. (PolicyPlus/PolicyLoader.vb:83-92) Doubt: The reach is now right, but 'each with a Registry.pol path' is false for a POL file source: its path is whatever file the person typed or browsed to (line 39, OpenPol.vb browse filter is *.pol), not a Registry.pol; only the local and per-user Group Policy have a Registry.pol path (lines 18, 41). Say: a POL file at the path given, the local Group Policy and a per-user Group Policy at their Registry.pol.

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

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
