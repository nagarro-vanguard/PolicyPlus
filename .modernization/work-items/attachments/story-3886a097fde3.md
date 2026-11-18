# Legacy reference: Export settings to a registry text file

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-3886a097fde3",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "A REG file cannot be used as a source for checking whether a value will be deleted: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 220,
            "lastLine": 222
          },
          "doubt": "The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target checking whether a value will be deleted. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact."
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "A REG file cannot be used as a source for reading a value: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 217,
            "lastLine": 219
          },
          "doubt": "The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target reading a value. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact."
        }
      ]
    },
    {
      "ac": "AC-3",
      "rules": [
        {
          "says": "A REG file cannot be used as a source for listing a key's values: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 223,
            "lastLine": 225
          },
          "doubt": "The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target listing a key's values. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact."
        }
      ]
    },
    {
      "ac": "AC-4",
      "rules": [
        {
          "says": "A REG file cannot be used as a source for asking whether a value is present: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 214,
            "lastLine": 216
          },
          "doubt": "The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target asking whether a value is present. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact."
        }
      ]
    },
    {
      "ac": "AC-5",
      "rules": [
        {
          "says": "A REG file cannot be used as a source for forgetting a value: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 237,
            "lastLine": 239
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-6",
      "rules": [
        {
          "says": "When a value is saved into a REG file, it is ignored if a source branch is set and its key lies outside that branch. When no branch is set, every key is accepted. Any value already stored under that name is replaced.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 226,
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
          "says": "When a value is deleted in a REG file, the request is ignored if a source branch is set and the key lies outside it, or if the key is already marked for removal. When no branch is set, every key is accepted. Otherwise the value is recorded as deleted.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 240,
            "lastLine": 247
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-8",
      "rules": [
        {
          "says": "When a key is cleared in a REG file, the request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted. Otherwise the key's earlier entries are replaced by a key-removal entry.",
          "where": {
            "file": "PolicyPlus/RegFile.vb",
            "firstLine": 248,
            "lastLine": 253
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
      "name": "Registry Export Source",
      "module": "registry-export-source",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 220,
      "lastLine": 222
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 217,
      "lastLine": 219
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 223,
      "lastLine": 225
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 214,
      "lastLine": 216
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 237,
      "lastLine": 239
    },
    {
      "file": "PolicyPlus/PolicySource.vb",
      "firstLine": 174,
      "lastLine": 177
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 226,
      "lastLine": 236
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 210,
      "lastLine": 213
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 240,
      "lastLine": 247
    },
    {
      "file": "PolicyPlus/RegFile.vb",
      "firstLine": 248,
      "lastLine": 253
    }
  ]
}
```

## What each criterion must keep

### AC-1

- A REG file cannot be used as a source for checking whether a value will be deleted: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch. (PolicyPlus/RegFile.vb:220-222) Doubt: The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target checking whether a value will be deleted. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact.

### AC-2

- A REG file cannot be used as a source for reading a value: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch. (PolicyPlus/RegFile.vb:217-219) Doubt: The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target reading a value. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact.

### AC-3

- A REG file cannot be used as a source for listing a key's values: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch. (PolicyPlus/RegFile.vb:223-225) Doubt: The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target listing a key's values. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact.

### AC-4

- A REG file cannot be used as a source for asking whether a value is present: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch. (PolicyPlus/RegFile.vb:214-216) Doubt: The second sentence is false for this stub. PolFile.ApplyDifference calls only DeleteValue, ClearKey, SetValue and ForgetValue on the target (157-170, 176); it never asks the target asking whether a value is present. So applying a policy file to a REG file does not fail through this routine; only ForgetValue (RegFile 237-239, reached at PolicySource 176) does. Either drop the claim from this rule, or drop the rule: a stub that throws and is never reached by the REG flows decides nothing a rebuilder needs. Keep the consequence on the ForgetValue rule and the existing fact.

### AC-5

- A REG file cannot be used as a source for forgetting a value: the request fails with 'not implemented'. Applying a newer policy file over an older one to a REG file fails this way for any dropped value under a policy branch. (PolicyPlus/RegFile.vb:237-239)

### AC-6

- When a value is saved into a REG file, it is ignored if a source branch is set and its key lies outside that branch. When no branch is set, every key is accepted. Any value already stored under that name is replaced. (PolicyPlus/RegFile.vb:226-236)

### AC-7

- When a value is deleted in a REG file, the request is ignored if a source branch is set and the key lies outside it, or if the key is already marked for removal. When no branch is set, every key is accepted. Otherwise the value is recorded as deleted. (PolicyPlus/RegFile.vb:240-247)

### AC-8

- When a key is cleared in a REG file, the request is ignored if a source branch is set and the key lies outside it. When no branch is set, every key is accepted. Otherwise the key's earlier entries are replaced by a key-removal entry. (PolicyPlus/RegFile.vb:248-253)

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
