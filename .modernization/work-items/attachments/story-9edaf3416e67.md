# Legacy reference: Keep and save policy comments for each source

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-9edaf3416e67",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A policy's comment in one area is empty when that source has no comment file or holds no comment for the policy, and otherwise the saved text.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 288,
            "lastLine": 293
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A source's comments are used only when it has a comment file location. The folder is created if missing; an existing file is loaded and a missing file gives no comments yet. Any failure leaves that source without comments.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 330,
            "lastLine": 344
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A source's comment list is saved to its comment file location whenever the list exists, even when empty; a source without comment support has no list and is skipped.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 618,
            "lastLine": 620
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A comment file is refused as unreadable when it has no comment-definitions section, a namespace entry without a prefix, a comment without a policy reference, a text without an id, or a repeated prefix, policy reference or text id. The comments of that source are then unavailable.",
          "where": {
            "file": "PolicyPlus/CmtxFile.vb",
            "firstLine": 13,
            "lastLine": 44
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "No comment of a comment file can be read when any comment's policy reference has no colon or a prefix that is not declared, its text is not written as \"$(resource.<id>)\", its text id is missing, or two comments resolve to the same policy.",
          "where": {
            "file": "PolicyPlus/CmtxFile.vb",
            "firstLine": 69,
            "lastLine": 76
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "Saving comments writes every comment and text held in memory into the target file, in schema version 1.0, replacing what the file held before.",
          "where": {
            "file": "PolicyPlus/CmtxFile.vb",
            "firstLine": 83,
            "lastLine": 122
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-7",
      "rules": [
        {
          "says": "When comments are saved, each comment gets its own text id built from the policy's namespace, policy name and a running number, and each distinct namespace gets a prefix made from its name (dots turned into underscores) and the running number.",
          "where": {
            "file": "PolicyPlus/CmtxFile.vb",
            "firstLine": 50,
            "lastLine": 63
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "The path of a policy source is fixed by its kind: Local GPO uses the Registry.pol file of the system's local Group Policy (user or machine folder) and its gpt.ini; a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers; a POL file and a user hive use the path given; Scratch space has none.",
      "builtBy": "Work out where each source's policy and comment files live"
    },
    {
      "says": "The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable.",
      "builtBy": "Work out where each source's policy and comment files live"
    },
    {
      "says": "When the Registry.pol of a POL file source, the local Group Policy or a per-user Group Policy does not exist, it is created empty with its folder and treated as writable; a mistyped SID therefore creates a new folder and empty file under the per-user policy folder. If creation fails, an empty read-only source is used and no error is shown.",
      "builtBy": "Provide an empty scratch source and policy files on the machine"
    },
    {
      "says": "A source read through the file branch covers a POL file, the local Group Policy and a per-user Group Policy, each with a Registry.pol path. An existing file is loaded; it is writable only when it can be opened for reading and writing, otherwise it can be viewed but not committed.",
      "builtBy": "Provide an empty scratch source and policy files on the machine"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Policy Comment Catalog",
      "module": "policy-comment-catalog",
      "layer": "packages/ui"
    },
    {
      "name": "Comment File Adapter",
      "module": "comment-file-adapter",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 288,
      "lastLine": 293
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 330,
      "lastLine": 344
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 618,
      "lastLine": 620
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 329,
      "lastLine": 345
    },
    {
      "file": "PolicyPlus/CmtxFile.vb",
      "firstLine": 13,
      "lastLine": 44
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 337,
      "lastLine": 343
    },
    {
      "file": "PolicyPlus/CmtxFile.vb",
      "firstLine": 69,
      "lastLine": 76
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 337,
      "lastLine": 343
    },
    {
      "file": "PolicyPlus/CmtxFile.vb",
      "firstLine": 83,
      "lastLine": 122
    },
    {
      "file": "PolicyPlus/CmtxFile.vb",
      "firstLine": 78,
      "lastLine": 80
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 616,
      "lastLine": 620
    },
    {
      "file": "PolicyPlus/CmtxFile.vb",
      "firstLine": 50,
      "lastLine": 63
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A policy's comment in one area is empty when that source has no comment file or holds no comment for the policy, and otherwise the saved text. (PolicyPlus/Main.vb:288-293)

### AC-2

- A source's comments are used only when it has a comment file location. The folder is created if missing; an existing file is loaded and a missing file gives no comments yet. Any failure leaves that source without comments. (PolicyPlus/Main.vb:330-344)

### AC-3

- A source's comment list is saved to its comment file location whenever the list exists, even when empty; a source without comment support has no list and is skipped. (PolicyPlus/Main.vb:618-620)

### AC-4

- A comment file is refused as unreadable when it has no comment-definitions section, a namespace entry without a prefix, a comment without a policy reference, a text without an id, or a repeated prefix, policy reference or text id. The comments of that source are then unavailable. (PolicyPlus/CmtxFile.vb:13-44)

### AC-5

- No comment of a comment file can be read when any comment's policy reference has no colon or a prefix that is not declared, its text is not written as "$(resource.<id>)", its text id is missing, or two comments resolve to the same policy. (PolicyPlus/CmtxFile.vb:69-76)

### AC-6

- Saving comments writes every comment and text held in memory into the target file, in schema version 1.0, replacing what the file held before. (PolicyPlus/CmtxFile.vb:83-122)

### AC-7

- When comments are saved, each comment gets its own text id built from the policy's namespace, policy name and a running number, and each distinct namespace gets a prefix made from its name (dots turned into underscores) and the running number. (PolicyPlus/CmtxFile.vb:50-63)

## Relies on, built elsewhere

- The path of a policy source is fixed by its kind: Local GPO uses the Registry.pol file of the system's local Group Policy (user or machine folder) and its gpt.ini; a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers; a POL file and a user hive use the path given; Scratch space has none. Built by: Work out where each source's policy and comment files live.
- The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable. Built by: Work out where each source's policy and comment files live.
- When the Registry.pol of a POL file source, the local Group Policy or a per-user Group Policy does not exist, it is created empty with its folder and treated as writable; a mistyped SID therefore creates a new folder and empty file under the per-user policy folder. If creation fails, an empty read-only source is used and no error is shown. Built by: Provide an empty scratch source and policy files on the machine.
- A source read through the file branch covers a POL file, the local Group Policy and a per-user Group Policy, each with a Registry.pol path. An existing file is loaded; it is writable only when it can be opened for reading and writing, otherwise it can be viewed but not committed. Built by: Provide an empty scratch source and policy files on the machine.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
