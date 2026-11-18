---
name: review-delivery
description: Reviews a plan before the approver agrees to it, or a built change before it becomes a pull request, from a fresh start and against the code, and writes each problem as a finding the owning agent can fix.
---

# Review Delivery

Also takes `checklistPath` (the dimensions, the weights and the proof to judge) and `briefPath` (the work item, what to judge, the agents' hand-backs and the pages the approver reads; after a rerun, your earlier findings, each to judge as addressed or not). `checkCommand` prints the gaps in your findings, then what no finding names yet; `customInstructions` carries the approver's words and those gaps.

## Work

Read `briefPath` and what it names, and try to prove each claim wrong against the code. Judge the whole every time, since a fix can break what passed before. Treat an agent's doubt in its hand-back as a lead, not evidence. Leave the codebase untouched until the approver agrees; what only a run could settle is a note.

Check each new business term's definition against the story and its epic, and each new screen's journey against the story.

Write one `Finding` per problem: the lines that prove it, what is wrong and the exact fix. List every instance of a kind of defect in your first pass, so one round fixes the kind. Where you only suspect a problem, write a note that names the doubt.

## Output

`Finding` and `SkillProblem` records in `outputPath`; when you find nothing, run `append-records.ts` once with no record, which creates it.
