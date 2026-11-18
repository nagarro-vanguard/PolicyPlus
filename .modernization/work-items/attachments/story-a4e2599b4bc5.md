# Legacy reference: Open policy sources, load their comments and report the result

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-a4e2599b4bc5",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "Opening new policy sources first closes the ones already open. Unsaved changes are discarded for sources backed by a POL file (local Group Policy files, a chosen POL file, a per-user Group Policy object) and for the empty source. A registry source applies changes at once, and a user hive file is applied when it is closed, so those lose nothing.",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 311,
            "lastLine": 315
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
      "ac": "AC-4",
      "rules": [
        {
          "says": "After opening, if either source is not fully writable the person is told \"Not all policy sources are fully writable.\" with the state of the user and the computer source; if both are fully writable, \"Both the user and computer policy sources are loaded and writable.\" appears only when opening was not quiet (never at start).",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 352,
            "lastLine": 360
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
      "firstLine": 311,
      "lastLine": 315
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 136,
      "lastLine": 148
    },
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 88,
      "lastLine": 91
    },
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 330,
      "lastLine": 344
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
      "file": "PolicyPlus/Main.vb",
      "firstLine": 352,
      "lastLine": 360
    }
  ]
}
```

## What each criterion must keep

### AC-1

- Opening new policy sources first closes the ones already open. Unsaved changes are discarded for sources backed by a POL file (local Group Policy files, a chosen POL file, a per-user Group Policy object) and for the empty source. A registry source applies changes at once, and a user hive file is applied when it is closed, so those lose nothing. (PolicyPlus/Main.vb:311-315)

### AC-2

- A source's comments are used only when it has a comment file location. The folder is created if missing; an existing file is loaded and a missing file gives no comments yet. Any failure leaves that source without comments. (PolicyPlus/Main.vb:330-344)

### AC-3

- A comment file is refused as unreadable when it has no comment-definitions section, a namespace entry without a prefix, a comment without a policy reference, a text without an id, or a repeated prefix, policy reference or text id. The comments of that source are then unavailable. (PolicyPlus/CmtxFile.vb:13-44)

### AC-4

- After opening, if either source is not fully writable the person is told "Not all policy sources are fully writable." with the state of the user and the computer source; if both are fully writable, "Both the user and computer policy sources are loaded and writable." appears only when opening was not quiet (never at start). (PolicyPlus/Main.vb:352-360)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
