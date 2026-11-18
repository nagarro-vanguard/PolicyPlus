# Legacy reference: Keep policy comments with their source and read comment files

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-9731b528cb3b",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 151,
            "lastLine": 162
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
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
      "ac": "AC-3",
      "rules": []
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "cited": [
    {
      "file": "PolicyPlus/PolicyLoader.vb",
      "firstLine": 151,
      "lastLine": 162
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
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable. (PolicyPlus/PolicyLoader.vb:151-162)

### AC-2

- No comment of a comment file can be read when any comment's policy reference has no colon or a prefix that is not declared, its text is not written as "$(resource.<id>)", its text id is missing, or two comments resolve to the same policy. (PolicyPlus/CmtxFile.vb:69-76)

### AC-3

No single legacy rule: it describes the behaviour as a whole.


## Reading of the existing code

The bundle for this part of the product was not built when this was written.
