# Review sheet: the rules of 70 pieces of code, from PolicyObjectContext_Opening (PolicyPlus/Main.vb:817-838)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-59373243740450631318
- businessrule-38749131863255466414
- businessrule-28806393002757226213
- businessrule-87657486652904748150
- businessrule-35086460485241143052
- businessrule-07587489877046572885
- businessrule-00751566620548008241
- businessrule-31923566714616007060
- businessrule-50106574781634158024

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/PolicyLoader.vb:64-77
PolicyPlus/PolicyLoader.vb:110-115
PolicyPlus/PolicyLoader.vb:123-133
PolicyPlus/PolicyLoader.vb:137-137
PolicyPlus/PolicyLoader.vb:145-145
PolicyPlus/PolicyLoader.vb:163-171
PolicyPlus/PolicyLoader.vb:173-206
PolicyPlus/PolicyProcessing.vb:11-18
PolicyPlus/PolicyProcessing.vb:50-61
PolicyPlus/PolicyProcessing.vb:114-132
PolicyPlus/PolicyProcessing.vb:190-262
PolicyPlus/SystemInfo.vb:3-11

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-8819654175358664/job.json
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

