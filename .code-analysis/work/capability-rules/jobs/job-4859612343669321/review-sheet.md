# Review sheet: the rules of 101 pieces of code, from SetPolicyState (PolicyPlus/PolicyProcessing.vb:265-379)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-94096870403138010392
- businessrule-05658025578078337801
- businessrule-76385195402833433249
- businessrule-88826214621110422700
- businessrule-29931230626107516630
- businessrule-81607167117754608646
- businessrule-65137522022904204765
- businessrule-84344008951700894793
- businessrule-66263631031623657336
- businessrule-50196517714792115621
- businessrule-61649183387974213066
- businessrule-55031419583562399434
- businessrule-16731175799320506925
- businessrule-37712134668774570897
- businessrule-49707971613348927878
- businessrule-38204095070245009027

The dropped records are listed below.

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/PolicyProcessing.vb:267-295
PolicyPlus/PolicyProcessing.vb:297-300
PolicyPlus/PolicyProcessing.vb:323-323
PolicyPlus/PolicyProcessing.vb:328-353
PolicyPlus/PolicyProcessing.vb:357-378
PolicyPlus/PolicyProcessing.vb:380-380
PolicyPlus/PolicyProcessing.vb:383-421
PolicyPlus/PolicyProcessing.vb:439-442
PolicyPlus/PolicySource.vb:118-133
PolicyPlus/PolicySource.vb:174-177
PolicyPlus/PolicySource.vb:183-189
PolicyPlus/RegFile.vb:4-6
PolicyPlus/RegFile.vb:214-225
PolicyPlus/RegFile.vb:237-239
PolicyPlus/SpolFile.vb:53-57
PolicyPlus/SpolFile.vb:78-78
PolicyPlus/SpolFile.vb:90-91
PolicyPlus/SpolFile.vb:105-117
PolicyPlus/SpolFile.vb:121-121
PolicyPlus/SpolFile.vb:209-214
PolicyPlus/XmlExtensions.vb:7-7
version.bat:3-7

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-4859612343669321/job.json
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
- businessrule-61145538589359839544, dropped because Review: a code mechanism or build step, not a business decision (see rounds/1 findings)
  {"id":"businessrule-61145538589359839544","says":"A registry key/value pair is never equal to an object of any other type.","decidedAt":{"file":"PolicyPlus/PolicyProcessing.vb","firstLine":439,"lastLine":442},"evidence":[]}
- businessrule-37660898767277172517, dropped because Review: a code mechanism or build step, not a business decision (see rounds/1 findings)
  {"id":"businessrule-37660898767277172517","says":"The program's version label is the output of 'git describe --always', written into a generated version file.","decidedAt":{"file":"version.bat","firstLine":3,"lastLine":7},"evidence":[]}
- businessrule-89228887298711868706, dropped because Review: a code mechanism or build step, not a business decision (see rounds/1 findings)
  {"id":"businessrule-89228887298711868706","says":"A missing XML attribute reads as nothing.","decidedAt":{"file":"PolicyPlus/XmlExtensions.vb","firstLine":7,"lastLine":7},"evidence":[]}
