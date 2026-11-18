# Legacy reference: Resolve where each policy source comes from and whether it can be saved

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-150cfe2cbb81",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The path of a policy source is fixed by its kind: Local GPO uses the Registry.pol file of the system's local Group Policy (user or machine folder) and its gpt.ini; a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers; a POL file and a user hive use the path given; Scratch space has none.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 16,
            "lastLine": 19
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
          "says": "A source is writable by default for Scratch space; for a registry source it is 'no writing' when the write test failed; for others it is 'no commit' when the file or hive could not be opened for writing.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 163,
            "lastLine": 172
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A policy source's writability is described as \"is fully writable\", \"cannot be saved\" (changes work in memory only) or \"cannot be modified\"; anything but fully writable counts as a problem.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 318,
            "lastLine": 327
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
      "firstLine": 163,
      "lastLine": 172
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 318,
      "lastLine": 327
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The path of a policy source is fixed by its kind: Local GPO uses the Registry.pol file of the system's local Group Policy (user or machine folder) and its gpt.ini; a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers; a POL file and a user hive use the path given; Scratch space has none. (PolicyPlus/PolicyLoader.vb:16-19)

### AC-2

- When the Registry.pol of a POL file source, the local Group Policy or a per-user Group Policy does not exist, it is created empty with its folder and treated as writable; a mistyped SID therefore creates a new folder and empty file under the per-user policy folder. If creation fails, an empty read-only source is used and no error is shown. (PolicyPlus/PolicyLoader.vb:93-105)

### AC-3

- A source is writable by default for Scratch space; for a registry source it is 'no writing' when the write test failed; for others it is 'no commit' when the file or hive could not be opened for writing. (PolicyPlus/PolicyLoader.vb:163-172)

### AC-4

- A policy source's writability is described as "is fully writable", "cannot be saved" (changes work in memory only) or "cannot be modified"; anything but fully writable counts as a problem. (PolicyPlus/Main.vb:318-327)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
