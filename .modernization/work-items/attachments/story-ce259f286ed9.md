# Legacy reference: Work out where each source's policy and comment files live

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-ce259f286ed9",
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
          "says": "The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable.",
          "where": {
            "file": "PolicyPlus/PolicyLoader.vb",
            "firstLine": 151,
            "lastLine": 162
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
  "steps": [],
  "components": [
    {
      "name": "Source Location Resolver",
      "module": "source-location-resolver",
      "layer": "packages/ui"
    }
  ],
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
      "firstLine": 151,
      "lastLine": 162
    }
  ]
}
```

## What each criterion must keep

### AC-1

- The path of a policy source is fixed by its kind: Local GPO uses the Registry.pol file of the system's local Group Policy (user or machine folder) and its gpt.ini; a per-user GPO uses the folder named by the person's SID under GroupPolicyUsers; a POL file and a user hive use the path given; Scratch space has none. (PolicyPlus/PolicyLoader.vb:16-19)

### AC-2

- The comment file for a source sits beside its file: the POL file or hive path with the extension changed to .cmtx; for Local GPO or per-user GPO a file named comment.cmtx in the same folder; for the registry a file under the person's local application data folder (one for user, one for machine); Scratch space has none, so comments are unavailable. (PolicyPlus/PolicyLoader.vb:151-162)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
