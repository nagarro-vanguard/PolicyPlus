# Legacy reference: Stamp the program with its Git version at build time

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-f39d9f2e035c",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "When the build script runs, it replaces the program's version in a generated source file with the text git gives for the current commit. That text is a tag, commit count and short commit name when tags exist, and a short commit name otherwise. The script runs when someone runs it or the release workflow does. The committed file holds an empty version.",
          "where": {
            "file": "version.bat",
            "firstLine": 1,
            "lastLine": 8
          },
          "doubt": "The description of git's text ('a tag, commit count and short commit name when tags exist, and a short commit name otherwise') rests on how git describe behaves, which the script does not show; it also omits that on a commit that is exactly tagged the text is the tag alone. State what the lines show (the script writes the output of 'git describe --always' as the version text) and put the detail of that output in an assumed Fact, or drop it. The script also rewrites the whole generated file (line 3 overwrites, 4-8 append), not just the version."
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
    }
  ],
  "reliesOn": [],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Version stamper",
      "module": "version-stamper",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "version.bat",
      "firstLine": 1,
      "lastLine": 8
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When the build script runs, it replaces the program's version in a generated source file with the text git gives for the current commit. That text is a tag, commit count and short commit name when tags exist, and a short commit name otherwise. The script runs when someone runs it or the release workflow does. The committed file holds an empty version. (version.bat:1-8) Doubt: The description of git's text ('a tag, commit count and short commit name when tags exist, and a short commit name otherwise') rests on how git describe behaves, which the script does not show; it also omits that on a commit that is exactly tagged the text is the tag alone. State what the lines show (the script writes the output of 'git describe --always' as the version text) and put the detail of that output in an assumed Fact, or drop it. The script also rewrites the whole generated file (line 3 overwrites, 4-8 append), not just the version.

### AC-2

No single legacy rule: it describes the behaviour as a whole.


### AC-3

No single legacy rule: it describes the behaviour as a whole.


### AC-4

No single legacy rule: it describes the behaviour as a whole.


## Reading of the existing code

The bundle for this part of the product was not built when this was written.
