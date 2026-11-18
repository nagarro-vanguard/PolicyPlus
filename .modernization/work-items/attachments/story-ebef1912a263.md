# Legacy reference: Bring in policy settings text and check...: Semantic Text Import Session

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-ebef1912a263",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "Opening Import SPOL discards any previously parsed SPOL so a cancelled session passes nothing back.",
          "where": {
            "file": "PolicyPlus/ImportSpol.vb",
            "firstLine": 27,
            "lastLine": 29
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "Open File puts the whole chosen file into the text box, replacing what was typed without asking and without checking it; Reset, after a Yes to \"Are you sure you want to reset the text box?\", restores the header \"Policy Plus Semantic Policy\" and blank lines.",
          "where": {
            "file": "PolicyPlus/ImportSpol.vb",
            "firstLine": 3,
            "lastLine": 10
          },
          "doubt": "Two decisions in one rule, and the second is owned by the wrong block: Open File (3-10) and Reset (36-40, a block of its own, given here only as evidence). Split into a rule for Open File decided at 3-10 (whole file replaces typed text without asking) and a rule for Reset decided at 36-40 (needs a Yes to the question, then restores the header). 'Without checking it' is the weakness in fact-44356108302568422603; do not repeat it inside the rule."
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "Apply accepts only SPOL text that reads correctly; the parsed file is passed back to the main window. Invalid text is refused with \"The SPOL text is invalid: \" and the reason.",
          "where": {
            "file": "PolicyPlus/ImportSpol.vb",
            "firstLine": 19,
            "lastLine": 26
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "A comment line in a semantic policy script is recognised without regard to letter case. A backslash followed by another backslash is one backslash, and a backslash followed by 'n' is a line break.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "A setting value in a semantic policy script is read in this order. Starting with # is a whole number, and a # value that is not a whole number fails with a conversion message. A plain non-negative number is an unsigned number. 'True' or 'False', in any letter case, is a yes/no value. Text in single quotes is text, and text in double quotes is a list of text. 'None' is an empty list. Anything else is refused with 'Unknown option data format.'.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "A semantic policy script is refused unless its first line is 'Policy Plus Semantic Policy', with the message 'Incorrect signature.'.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "The state in a semantic policy script must be 'Not configured', 'Enabled' or 'Disabled', regardless of case. Anything else is refused with 'Unknown policy state.'.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "When a semantic policy script fails to load, the error gives the line it stopped at, in the form '(Error found on line N.)'.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "A semantic policy script is read in lines separated by carriage return and line feed. A script using line feeds alone is read as one line, so it is refused with the signature message.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "A comment in a semantic policy script is refused when it ends with a lone backslash, with the message 'Escape sequence started at end of comment.'. A backslash followed by any other character is refused with 'Unknown comment escape sequence' naming it.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "A policy header line in a semantic policy script is a user policy only when its first word is exactly 'U'. Any other first word, including lowercase 'u' or 'User', is a machine policy. The rest of the line is the policy's identifier. A header with no space after the first word fails with a general index error, with the line number but no reason.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "A bracketed setting in a semantic policy script holds one line per entry. Entries with one text are a list, entries with two texts are a table of name and value. With no entries the setting is stored with no value. For a list setting, the existing entries are then removed unless the definition keeps other entries, and nothing is written. For any other kind of setting the empty value makes the write fail.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "Settings are read only for a policy that is Enabled. Lines under Not configured or Disabled are not read as settings but as the next policy's header.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "Verify reads the SPOL text and reports \"Validation successful, N policy settings found.\" or \"SPOL validation failed: \" followed by the reason; nothing is applied.",
      "builtBy": "Bring in policy settings text and check it as i...: Semantic Text Reader"
    },
    {
      "says": "When a semantic policy is applied, the policy's earlier settings are wiped first and then the stated state and settings are written.",
      "builtBy": "Apply a checked semantic policy text to the policy sources"
    },
    {
      "says": "When a semantic policy script is applied to many policies, a policy that fails is skipped and counted, and the rest are still applied. The caller gets only the number of failures, not which policy or why.",
      "builtBy": "Apply a checked semantic policy text to the policy sources"
    },
    {
      "says": "A semantic policy script applies each policy to the machine source or the user source by its section.",
      "builtBy": "Apply a checked semantic policy text to the policy sources"
    },
    {
      "says": "When a semantic policy is applied, a comment is stored for the policy first, only if one is given and a comment store exists, before the old settings are wiped and the new ones written. If the writing fails, the new comment stays against a half-written policy. An empty comment leaves any existing comment alone.",
      "builtBy": "Apply a checked semantic policy text to the policy sources"
    },
    {
      "says": "Importing semantic policy applies all its policies to both sources and comments; the person sees \"Semantic Policy successfully applied.\" or \"N out of M could not be applied.\" when some failed, and the view refreshes either way.",
      "builtBy": "Apply a checked semantic policy text to the policy sources"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Semantic Text Import Session",
      "module": "semantic-text-import-session",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/ImportSpol.vb",
      "firstLine": 27,
      "lastLine": 29
    },
    {
      "file": "PolicyPlus/ImportSpol.vb",
      "firstLine": 3,
      "lastLine": 10
    },
    {
      "file": "PolicyPlus/ImportSpol.vb",
      "firstLine": 36,
      "lastLine": 40
    },
    {
      "file": "PolicyPlus/ImportSpol.vb",
      "firstLine": 19,
      "lastLine": 26
    }
  ]
}
```

## What each criterion must keep

### AC-1

- Opening Import SPOL discards any previously parsed SPOL so a cancelled session passes nothing back. (PolicyPlus/ImportSpol.vb:27-29)

### AC-2

- Open File puts the whole chosen file into the text box, replacing what was typed without asking and without checking it; Reset, after a Yes to "Are you sure you want to reset the text box?", restores the header "Policy Plus Semantic Policy" and blank lines. (PolicyPlus/ImportSpol.vb:3-10) Doubt: Two decisions in one rule, and the second is owned by the wrong block: Open File (3-10) and Reset (36-40, a block of its own, given here only as evidence). Split into a rule for Open File decided at 3-10 (whole file replaces typed text without asking) and a rule for Reset decided at 36-40 (needs a Yes to the question, then restores the header). 'Without checking it' is the weakness in fact-44356108302568422603; do not repeat it inside the rule.

### AC-3

- Apply accepts only SPOL text that reads correctly; the parsed file is passed back to the main window. Invalid text is refused with "The SPOL text is invalid: " and the reason. (PolicyPlus/ImportSpol.vb:19-26)

## Relies on, built elsewhere

- A comment line in a semantic policy script is recognised without regard to letter case. A backslash followed by another backslash is one backslash, and a backslash followed by 'n' is a line break. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- A setting value in a semantic policy script is read in this order. Starting with # is a whole number, and a # value that is not a whole number fails with a conversion message. A plain non-negative number is an unsigned number. 'True' or 'False', in any letter case, is a yes/no value. Text in single quotes is text, and text in double quotes is a list of text. 'None' is an empty list. Anything else is refused with 'Unknown option data format.'. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- A semantic policy script is refused unless its first line is 'Policy Plus Semantic Policy', with the message 'Incorrect signature.'. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- The state in a semantic policy script must be 'Not configured', 'Enabled' or 'Disabled', regardless of case. Anything else is refused with 'Unknown policy state.'. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- When a semantic policy script fails to load, the error gives the line it stopped at, in the form '(Error found on line N.)'. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- A semantic policy script is read in lines separated by carriage return and line feed. A script using line feeds alone is read as one line, so it is refused with the signature message. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- A comment in a semantic policy script is refused when it ends with a lone backslash, with the message 'Escape sequence started at end of comment.'. A backslash followed by any other character is refused with 'Unknown comment escape sequence' naming it. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- A policy header line in a semantic policy script is a user policy only when its first word is exactly 'U'. Any other first word, including lowercase 'u' or 'User', is a machine policy. The rest of the line is the policy's identifier. A header with no space after the first word fails with a general index error, with the line number but no reason. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- A bracketed setting in a semantic policy script holds one line per entry. Entries with one text are a list, entries with two texts are a table of name and value. With no entries the setting is stored with no value. For a list setting, the existing entries are then removed unless the definition keeps other entries, and nothing is written. For any other kind of setting the empty value makes the write fail. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- Settings are read only for a policy that is Enabled. Lines under Not configured or Disabled are not read as settings but as the next policy's header. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- Verify reads the SPOL text and reports "Validation successful, N policy settings found." or "SPOL validation failed: " followed by the reason; nothing is applied. Built by: Bring in policy settings text and check it as i...: Semantic Text Reader.
- When a semantic policy is applied, the policy's earlier settings are wiped first and then the stated state and settings are written. Built by: Apply a checked semantic policy text to the policy sources.
- When a semantic policy script is applied to many policies, a policy that fails is skipped and counted, and the rest are still applied. The caller gets only the number of failures, not which policy or why. Built by: Apply a checked semantic policy text to the policy sources.
- A semantic policy script applies each policy to the machine source or the user source by its section. Built by: Apply a checked semantic policy text to the policy sources.
- When a semantic policy is applied, a comment is stored for the policy first, only if one is given and a comment store exists, before the old settings are wiped and the new ones written. If the writing fails, the new comment stays against a half-written policy. An empty comment leaves any existing comment alone. Built by: Apply a checked semantic policy text to the policy sources.
- Importing semantic policy applies all its policies to both sources and comments; the person sees "Semantic Policy successfully applied." or "N out of M could not be applied." when some failed, and the view refreshes either way. Built by: Apply a checked semantic policy text to the policy sources.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
