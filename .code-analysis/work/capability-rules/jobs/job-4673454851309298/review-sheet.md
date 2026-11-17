# Review sheet: the rules of 40 pieces of code, from InitializeComponent (PolicyPlus/DetailPolicy.Designer.vb:23-277)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-75514996149963994067
- businessrule-12903793593857930277
- businessrule-85898125898656647205
- businessrule-37189424716400611847
- businessrule-40115005585170371286
- businessrule-14635991413229479057
- receipt-71635299021730767104

The dropped records are listed below.

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/DetailPolicy.Designer.vb:23-277
PolicyPlus/DetailPolicy.vb:3-42
PolicyPlus/DetailProduct.Designer.vb:6-15
PolicyPlus/DetailProduct.Designer.vb:23-262
PolicyPlus/DetailProduct.vb:3-47
PolicyPlus/DetailSupport.Designer.vb:6-15
PolicyPlus/DetailSupport.Designer.vb:23-213
PolicyPlus/DetailSupport.vb:2-49
PolicyPlus/DownloadAdmx.Designer.vb:6-15
PolicyPlus/DownloadAdmx.Designer.vb:23-132
PolicyPlus/DownloadAdmx.vb:7-130
PolicyPlus/EditPol.Designer.vb:6-15
PolicyPlus/EditPol.Designer.vb:23-165
PolicyPlus/EditPol.vb:5-247
PolicyPlus/EditPolDelete.vb:10-18

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-4673454851309298/job.json
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
- businessrule-97272182727099662404, dropped because Folded into the add-key rule / prompt rule; one decision stated once (review finding)
  {"id":"businessrule-97272182727099662404","says":"A new key name is invalid when it contains a backslash.","decidedAt":{"file":"PolicyPlus/EditPol.vb","firstLine":107,"lastLine":109},"evidence":[]}
- businessrule-22829021656307913118, dropped because Folded into the add-key rule / prompt rule; one decision stated once (review finding)
  {"id":"businessrule-22829021656307913118","says":"A new key name is unavailable when a sibling key under the same parent has the same name, ignoring case.","decidedAt":{"file":"PolicyPlus/EditPol.vb","firstLine":110,"lastLine":112},"evidence":[]}
- businessrule-43522967721888344469, dropped because Folded into the add-key rule / prompt rule; one decision stated once (review finding)
  {"id":"businessrule-43522967721888344469","says":"Cancelling the data dialog leaves the policy file unchanged.","decidedAt":{"file":"PolicyPlus/EditPol.vb","firstLine":130,"lastLine":153},"evidence":[{"file":"PolicyPlus/EditPol.vb","firstLine":168,"lastLine":172},{"file":"PolicyPlus/EditPol.vb","firstLine":242,"lastLine":246}]}
