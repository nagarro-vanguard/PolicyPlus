# Legacy reference: Load policy definitions from a folder or...: Definition load coordinator

The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.

## Header

```json
{
  "story": "story-0fb110144cfb",
  "fingerprint": "280637421a2d33856d0f4655b9cf3df29c3a1ebf99ebbb84e7839ee4506bf978",
  "criteria": [
    {
      "ac": "AC-1",
      "rules": [
        {
          "says": "When loading definitions reports no problems nothing is shown; otherwise the person sees \"Errors were encountered while adding administrative templates to the workspace.\" with each problem, and, only where a choice is wanted, is asked \"Continue trying to use this workspace?\".",
          "where": {
            "file": "PolicyPlus/Main.vb",
            "firstLine": 471,
            "lastLine": 475
          },
          "doubt": ""
        }
      ]
    },
    {
      "ac": "AC-2",
      "rules": [
        {
          "says": "Loading a single template file adds that file alone to the policies already loaded, builds the structures, and reports one failure when the file is refused.",
          "where": {
            "file": "PolicyPlus/AdmxBundle.vb",
            "firstLine": 30,
            "lastLine": 32
          },
          "doubt": ""
        }
      ]
    }
  ],
  "reliesOn": [
    {
      "says": "Only files directly in the chosen folder whose names end in .admx (in any letter case) are loaded as templates; subfolders and other files are ignored.",
      "builtBy": "Find each template and its text in the perso...: Template folder scanner"
    },
    {
      "says": "The language file for a template is taken from the subfolder named exactly by the language code if it holds this template's file; else from the first subfolder whose name starts with the same language part (before the dash, compared with capital letters mattering) that holds this template's file; else from the en-US subfolder if it holds it. A folder lacking the file is skipped.",
      "builtBy": "Find each template and its text in the person'...: Language file locator"
    },
    {
      "says": "The language for definition text is the saved language code, or the computer's own language when none is saved.",
      "builtBy": "Find each template and its text in the person'...: Language file locator"
    },
    {
      "says": "When no language file is found in any of those places, the template file is refused with \"The corresponding ADML is missing\" and none of its content is loaded.",
      "builtBy": "Find each template and its text in the person'...: Language file locator"
    },
    {
      "says": "A category whose parent is named is attached under that parent, found among items of this load or of files loaded earlier; when the parent is not found, the category has no parent but is still listed among the top-level categories.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A policy takes its category and its 'supported on' rule from the references in its own content, and has options only when it contains an options section.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A policy is listed under the category its reference names, found in this load or earlier ones; when that category is not found the policy is kept in the policy list but belongs to no category.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A policy shows the 'supported on' rule its reference names, found in this load or earlier ones; when none is found it has none.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A child product (major or minor version) is attached under its parent product, which must be defined in the same template file; only products without a parent are listed as top-level products.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A support rule entry is linked to the product its reference names; when no such product exists it is linked to the support rule of that name; when neither exists it stays unlinked.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "When both a template file and its language file load, the template's categories, products, support rules and policies are staged for the next build and the pair is recorded as loaded under the template's namespace.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "When the structures are built, all new categories, products, support rules and policies join the final lists and the staged items are cleared, so loading further files adds to what is already available.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A policy applies to computers when its class is \"Machine\", to users when \"User\", and to both for any other class value.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A policy applies to an area when its definition declares that area; a policy declared for both applies to each.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A policy is a preference, not a managed policy, when it names a registry key outside the three policy locations: software\\policies, software\\microsoft\\windows\\currentversion\\policies and system\\currentcontrolset\\policies.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A registry key counts as a policy key when it is one of the three policy branches (software\\policies, software\\microsoft\\windows\\currentversion\\policies, system\\currentcontrolset\\policies) or lies below one, regardless of case.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    },
    {
      "says": "A support rule is 'any of' when its first logic element is \"or\", 'all of' when it is \"and\", and blank otherwise; only that first logic element is read, each reference or range in it becomes an entry, and a range may carry a minimum and maximum version.",
      "builtBy": "Work out categories, products, policies...: Definition structure builder"
    }
  ],
  "data": [],
  "transitions": [],
  "outsideSystems": [],
  "steps": [],
  "components": [
    {
      "name": "Definition load coordinator",
      "module": "definition-load-coordinator",
      "layer": "packages/ui"
    }
  ],
  "cited": [
    {
      "file": "PolicyPlus/Main.vb",
      "firstLine": 471,
      "lastLine": 475
    },
    {
      "file": "PolicyPlus/AdmxBundle.vb",
      "firstLine": 30,
      "lastLine": 32
    }
  ]
}
```

## What each criterion must keep

### AC-1

- When loading definitions reports no problems nothing is shown; otherwise the person sees "Errors were encountered while adding administrative templates to the workspace." with each problem, and, only where a choice is wanted, is asked "Continue trying to use this workspace?". (PolicyPlus/Main.vb:471-475)

### AC-2

- Loading a single template file adds that file alone to the policies already loaded, builds the structures, and reports one failure when the file is refused. (PolicyPlus/AdmxBundle.vb:30-32)

## Relies on, built elsewhere

- Only files directly in the chosen folder whose names end in .admx (in any letter case) are loaded as templates; subfolders and other files are ignored. Built by: Find each template and its text in the perso...: Template folder scanner.
- The language file for a template is taken from the subfolder named exactly by the language code if it holds this template's file; else from the first subfolder whose name starts with the same language part (before the dash, compared with capital letters mattering) that holds this template's file; else from the en-US subfolder if it holds it. A folder lacking the file is skipped. Built by: Find each template and its text in the person'...: Language file locator.
- The language for definition text is the saved language code, or the computer's own language when none is saved. Built by: Find each template and its text in the person'...: Language file locator.
- When no language file is found in any of those places, the template file is refused with "The corresponding ADML is missing" and none of its content is loaded. Built by: Find each template and its text in the person'...: Language file locator.
- A category whose parent is named is attached under that parent, found among items of this load or of files loaded earlier; when the parent is not found, the category has no parent but is still listed among the top-level categories. Built by: Work out categories, products, policies...: Definition structure builder.
- A policy takes its category and its 'supported on' rule from the references in its own content, and has options only when it contains an options section. Built by: Work out categories, products, policies...: Definition structure builder.
- A policy is listed under the category its reference names, found in this load or earlier ones; when that category is not found the policy is kept in the policy list but belongs to no category. Built by: Work out categories, products, policies...: Definition structure builder.
- A policy shows the 'supported on' rule its reference names, found in this load or earlier ones; when none is found it has none. Built by: Work out categories, products, policies...: Definition structure builder.
- A child product (major or minor version) is attached under its parent product, which must be defined in the same template file; only products without a parent are listed as top-level products. Built by: Work out categories, products, policies...: Definition structure builder.
- A support rule entry is linked to the product its reference names; when no such product exists it is linked to the support rule of that name; when neither exists it stays unlinked. Built by: Work out categories, products, policies...: Definition structure builder.
- When both a template file and its language file load, the template's categories, products, support rules and policies are staged for the next build and the pair is recorded as loaded under the template's namespace. Built by: Work out categories, products, policies...: Definition structure builder.
- When the structures are built, all new categories, products, support rules and policies join the final lists and the staged items are cleared, so loading further files adds to what is already available. Built by: Work out categories, products, policies...: Definition structure builder.
- A policy applies to computers when its class is "Machine", to users when "User", and to both for any other class value. Built by: Work out categories, products, policies...: Definition structure builder.
- A policy applies to an area when its definition declares that area; a policy declared for both applies to each. Built by: Work out categories, products, policies...: Definition structure builder.
- A policy is a preference, not a managed policy, when it names a registry key outside the three policy locations: software\policies, software\microsoft\windows\currentversion\policies and system\currentcontrolset\policies. Built by: Work out categories, products, policies...: Definition structure builder.
- A registry key counts as a policy key when it is one of the three policy branches (software\policies, software\microsoft\windows\currentversion\policies, system\currentcontrolset\policies) or lies below one, regardless of case. Built by: Work out categories, products, policies...: Definition structure builder.
- A support rule is 'any of' when its first logic element is "or", 'all of' when it is "and", and blank otherwise; only that first logic element is read, each reference or range in it becomes an entry, and a range may carry a minimum and maximum version. Built by: Work out categories, products, policies...: Definition structure builder.

## Reading of the existing code

The bundle for this part of the product was not built when this was written.
