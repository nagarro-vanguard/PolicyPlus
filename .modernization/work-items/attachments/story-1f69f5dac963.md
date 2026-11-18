# Legacy reference: Open policy sources from imported files and describe them

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-1f69f5dac963",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with \"The root key is not valid.\" A path after the root is opened, and created if missing.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 20,
            "lastLine": 37
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
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
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A user hive source is mounted by loading the hive file under a fresh temporary name in the machine registry, after the backup and restore privileges are switched on. If the hive cannot be opened afterwards, the source becomes an empty, read-only scratch source instead, without telling the person.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 62,
            "lastLine": 79
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
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
      "ac": "AC-5",
      "rules": [
        {
          "says": "A registry source counts as writable only when a test value can be written under Software\\Policies and removed again; otherwise it is read-only.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 52,
            "lastLine": 61
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "The source name shown in the status bar is Local GPO, Registry, File, User GPO, User hive or Scratch space, followed by the path or SID in brackets when there is one.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 218,
            "lastLine": 236
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "Reading a value from the live registry gives nothing when the key is missing. Signed numbers are returned as the unsigned numbers policies use, and environment variables in text are not expanded.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 391,
            "lastLine": 403
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing.",
          "where": {
            "file": "PolicyPlus/PolicySource.vb",
            "firstLine": 374,
            "lastLine": 383
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-9",
      "rules": [
        {
          "says": "When a source is closed, a mounted user hive is unloaded and the result tells whether unloading succeeded; every other kind of source closes successfully.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 109,
            "lastLine": 116
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-10",
      "rules": [
        {
          "says": "Closing the policy sources tells the person \"Cleanup did not complete fully because the loaded resources are open in other programs.\" when any source could not release its resources.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 364,
            "lastLine": 373
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
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 20,
      "lastLine": 37
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
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 62,
      "lastLine": 79
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 80,
      "lastLine": 81
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 52,
      "lastLine": 61
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 218,
      "lastLine": 236
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 391,
      "lastLine": 403
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 374,
      "lastLine": 383
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 109,
      "lastLine": 116
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 364,
      "lastLine": 373
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 685,
      "lastLine": 687
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A registry source must start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any case); otherwise it is refused with "The root key is not valid." A path after the root is opened, and created if missing. (PolicyPlus/PolicyLoader.vb:20-37)

### AC-2

- A source read through the file branch covers a POL file, the local Group Policy and a per-user Group Policy, each with a Registry.pol path. An existing file is loaded; it is writable only when it can be opened for reading and writing, otherwise it can be viewed but not committed. (PolicyPlus/PolicyLoader.vb:83-92) Doubt: The reach is now right, but 'each with a Registry.pol path' is false for a POL file source: its path is whatever file the person typed or browsed to (line 39, OpenPol.vb browse filter is *.pol), not a Registry.pol; only the local and per-user Group Policy have a Registry.pol path (lines 18, 41). Say: a POL file at the path given, the local Group Policy and a per-user Group Policy at their Registry.pol.

### AC-3

- A user hive source is mounted by loading the hive file under a fresh temporary name in the machine registry, after the backup and restore privileges are switched on. If the hive cannot be opened afterwards, the source becomes an empty, read-only scratch source instead, without telling the person. (PolicyPlus/PolicyLoader.vb:62-79)

### AC-4

- A Scratch space source is an empty policy store that can be changed but is never saved anywhere. (PolicyPlus/PolicyLoader.vb:80-81)

### AC-5

- A registry source counts as writable only when a test value can be written under Software\Policies and removed again; otherwise it is read-only. (PolicyPlus/PolicyLoader.vb:52-61)

### AC-6

- The source name shown in the status bar is Local GPO, Registry, File, User GPO, User hive or Scratch space, followed by the path or SID in brackets when there is one. (PolicyPlus/PolicyLoader.vb:218-236)

### AC-7

- Reading a value from the live registry gives nothing when the key is missing. Signed numbers are returned as the unsigned numbers policies use, and environment variables in text are not expanded. (PolicyPlus/PolicySource.vb:391-403)

### AC-8

- When a number is saved to the live registry, an unsigned 32-bit or 64-bit number is converted to the signed number the registry stores with the same bits, and the key is created if missing. (PolicyPlus/PolicySource.vb:374-383)

### AC-9

- When a source is closed, a mounted user hive is unloaded and the result tells whether unloading succeeded; every other kind of source closes successfully. (PolicyPlus/PolicyLoader.vb:109-116)

### AC-10

- Closing the policy sources tells the person "Cleanup did not complete fully because the loaded resources are open in other programs." when any source could not release its resources. (PolicyPlus/Main.vb:364-373)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
