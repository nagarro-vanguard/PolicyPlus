# Review sheet: the rules of 66 pieces of code, from InitializeComponent (PolicyPlus/Main.Designer.vb:23-704)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-82331725036702428749
- businessrule-86967689578973652760
- businessrule-80795586956707195981
- businessrule-08168073526228912518
- businessrule-31455009568327717464
- businessrule-08067630111708103922
- businessrule-90005667452070169660
- receipt-18334697545915005802

The dropped records are listed below.

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmxStructures.vb:55-59
PolicyPlus/Main.Designer.vb:23-704
PolicyPlus/Main.vb:18-816

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-8256451594606636/job.json
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
- businessrule-58656437735575460450, dropped because Spans several blocks; split per block
  {"id":"businessrule-58656437735575460450","says":"Find by Text and Find by Registry start a search only when their dialog was accepted. Cancelling starts nothing and keeps earlier results.","decidedAt":{"file":"PolicyPlus/Main.vb","firstLine":645,"lastLine":671},"evidence":[{"file":"PolicyPlus/Main.vb","firstLine":375,"lastLine":388}]}
