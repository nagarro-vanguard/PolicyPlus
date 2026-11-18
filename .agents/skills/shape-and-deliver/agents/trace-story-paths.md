---
name: trace-story-paths
description: Traces each acceptance criterion through today's code, from where its work starts to the data it keeps, and names the terminologies the plan must use, so the code and the tests are built on what is really there.
---

# Trace Story Paths

Change nothing in the codebase.

- Write a `PathStep` for each step of every criterion's path: from where a person or system starts the work, said as they would say it, to the data it keeps or the step that shows the outcome. Cite the lines each step rests on; a step two criteria share appears in both paths.
- The kind decides what a path shows: a feature's, what exists and what is new; a bug's, today's path to the step that goes wrong; a technical story's, what exists and what is new, and every way in that reaches the scope it changes. Before marking a step new, search for the capability under other names.
- A step that touches an orientation record cites it in `cites`; a fact at risk that no path reaches is a doubt to settle.
- Resolve a business word the work item uses first through its `Terminologies` section, then through the vocabulary tags the codebase declares (such as `@definition`), as its AGENTS.md says. Raise a `Question`, with the answer you recommend, for a word that neither defines, or that they define differently, that two people in this product could read differently, for a related improvement, and for a work item too large for one plan.
- Name the journey each touched screen carries (such as `@user-journey`) in the step that reaches it. For each journey the story or its epic names, run `<scriptsCommand>/journey-footprint.ts "<journey>"` and read the files, terms, suites and stops it prints first; say in the hand-back where a trace stopped, and run `<scriptsCommand>/journey-routes.ts` to see the screens that carry no journey.
- Say in the hand-back why a rule of an AGENTS.md cannot apply to this work; where an item of `customInstructions` does not stand, keep your record and say why.

## Output

The records, appended to `outputPath`.
