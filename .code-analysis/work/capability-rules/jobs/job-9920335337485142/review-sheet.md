# Review sheet: the rules of 40 pieces of code, from New (PolicyPlus/AdmlFile.vb:9-10)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-55802799393616107150
- businessrule-45773352727154674148
- businessrule-28956915636023055080
- businessrule-17042177071399627897
- businessrule-39543778824930693436
- businessrule-58199052479074575766
- businessrule-10984672369270486524
- businessrule-65481681377113464148
- businessrule-02962717320575821827
- fact-02050997768862362813
- receipt-91150028805431803495

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmlFile.vb:9-116
PolicyPlus/AdmxBundle.vb:18-229
PolicyPlus/AdmxBundle.vb:243-272
PolicyPlus/AdmxFile.vb:12-263
PolicyPlus/CmtxFile.vb:7-123
PolicyPlus/ConfigurationStorage.vb:4-19
PolicyPlus/DetailAdmx.Designer.vb:6-15
PolicyPlus/DetailAdmx.Designer.vb:23-294
PolicyPlus/DetailAdmx.vb:2-32
PolicyPlus/DetailCategory.Designer.vb:6-15
PolicyPlus/DetailCategory.Designer.vb:23-200
PolicyPlus/DetailCategory.vb:3-25
PolicyPlus/DetailPolicy.Designer.vb:6-15

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-9920335337485142/job.json
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

