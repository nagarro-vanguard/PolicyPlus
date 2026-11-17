# Review sheet: the rules of 60 pieces of code, from LsvPol_SelectedIndexChanged (PolicyPlus/EditPol.vb:248-275)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-33763520985782152758
- businessrule-83231235361642585697
- businessrule-80613162490595796566
- businessrule-72041445841567473022
- businessrule-66436426925001128563
- receipt-18199262055913803746

The dropped records are listed below.

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/EditPol.vb:248-283
PolicyPlus/EditPolDelete.Designer.vb:6-15
PolicyPlus/EditPolDelete.Designer.vb:23-126
PolicyPlus/EditPolDelete.vb:2-25
PolicyPlus/EditPolKey.Designer.vb:6-15
PolicyPlus/EditPolKey.Designer.vb:23-78
PolicyPlus/EditPolKey.vb:2-16
PolicyPlus/EditPolMultiStringData.Designer.vb:6-15
PolicyPlus/EditPolMultiStringData.Designer.vb:23-101
PolicyPlus/EditPolMultiStringData.vb:2-10
PolicyPlus/EditPolNumericData.Designer.vb:6-15
PolicyPlus/EditPolNumericData.Designer.vb:23-113
PolicyPlus/EditPolNumericData.vb:2-14
PolicyPlus/EditPolNumericData.vb:21-58
PolicyPlus/EditPolStringData.Designer.vb:6-15
PolicyPlus/EditPolStringData.Designer.vb:23-99
PolicyPlus/EditPolStringData.vb:2-11
PolicyPlus/EditPolValue.Designer.vb:6-15
PolicyPlus/EditPolValue.Designer.vb:23-101
PolicyPlus/EditPolValue.vb:5-28
PolicyPlus/EditSetting.Designer.vb:6-15
PolicyPlus/EditSetting.Designer.vb:23-250
PolicyPlus/EditSetting.vb:15-345
PolicyPlus/EditSetting.vb:349-351
PolicyPlus/ExportReg.Designer.vb:6-15
PolicyPlus/ExportReg.Designer.vb:23-141
PolicyPlus/ExportReg.vb:3-35
PolicyPlus/FilterOptions.Designer.vb:6-15

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-2904793062372006/job.json
- the accepted lives it chose from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/lifecycles.jsonl

## What this stage's findings are known for
# Review checklist: Business rules

Every rule is shown on its capability's page to people who must rebuild or change the system without losing one; a rule's `gates` places it on the change of state it governs. A rule claims its whole condition and outcome; a block with no rule claims, by its absence of one, that it decides nothing.

## Wrong

- A mechanism written as a rule (logging, caching, mapping fields, retries that change no outcome): it costs the reader's trust. A mechanism that many capabilities share is not lost: Publish's briefing names it as a cross-cutting concern, found by rule from the shared blocks.
- One decision split into several rules, or several decisions merged into one whose words a tester could not check.
- A rule owned by the block that shows its message rather than the block that decides it.
- A `gates` naming a transition the rule does not allow or refuse; a rule that gates a transition left without `gates`.
- Words that are the code's, not the business's: a column, a flag or a procedure where the reader needs what it means.

## Missing

- A rule inside a block the writer left with none, or inside a block that decides another rule.
- A rule whose value or message is decided in code the job reaches beyond its blocks, left out because it lies elsewhere.
- A rule held in data or configuration outside the code, with no assumption saying so.
- A rule in a block's own lines missed because the block holds others read elsewhere (`readInOtherJobs`): the job reads the lines between them.
- A rule a block's links out show it applies (a check before a save, a lookup that refuses) left unwritten.


## Dropped records
- businessrule-32752098524263988675, dropped because Reviewed: duplicate or unreachable; merged into one rule
  {"id":"businessrule-32752098524263988675","says":"When Escape is pressed in the dialog, it closes as cancelled and nothing in it is applied.","decidedAt":{"file":"PolicyPlus/EditPolMultiStringData.vb","firstLine":3,"lastLine":3},"evidence":[]}
- businessrule-33115199896724232775, dropped because Reviewed: duplicate or unreachable; merged into one rule
  {"id":"businessrule-33115199896724232775","says":"When Escape is pressed in the dialog, it closes as cancelled and nothing in it is applied.","decidedAt":{"file":"PolicyPlus/EditPolNumericData.vb","firstLine":13,"lastLine":13},"evidence":[]}
- businessrule-43509070915921818842, dropped because Reviewed: duplicate or unreachable; merged into one rule
  {"id":"businessrule-43509070915921818842","says":"When Escape is pressed in the dialog, it closes as cancelled and nothing in it is applied.","decidedAt":{"file":"PolicyPlus/EditPolStringData.vb","firstLine":10,"lastLine":10},"evidence":[]}
- businessrule-63914844830068848650, dropped because Reviewed: duplicate or unreachable; merged into one rule
  {"id":"businessrule-63914844830068848650","says":"When Escape is pressed in the dialog, it closes as cancelled and nothing in it is applied.","decidedAt":{"file":"PolicyPlus/EditPolValue.vb","firstLine":6,"lastLine":6},"evidence":[]}
- businessrule-71698459702357853491, dropped because Reviewed: duplicate or unreachable; merged into one rule
  {"id":"businessrule-71698459702357853491","says":"When the dialog is closed after any Apply, it reports OK.","decidedAt":{"file":"PolicyPlus/EditSetting.vb","firstLine":344,"lastLine":344},"evidence":[]}
