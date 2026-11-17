# Review sheet: the rules of 40 pieces of code, from PresentDialog (PolicyPlus/InspectPolicyElements.vb:3-186)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-47148561883810888438
- businessrule-26015139546761240081
- businessrule-02674273054544844500
- businessrule-45321752096004927335
- businessrule-23966806023143279041
- businessrule-19624727502016697772
- businessrule-31478983642564096236
- businessrule-25802288009358362597
- businessrule-66216854943371680983
- businessrule-54054241002296188881
- businessrule-62780234159668215967
- businessrule-04556175355589198922
- businessrule-06952902974570199282
- businessrule-76853742595600468196
- receipt-97421251183440284778

The dropped records are listed below.

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/InspectPolicyElements.vb:1-194
PolicyPlus/InspectSpolFragment.Designer.vb:6-121
PolicyPlus/InspectSpolFragment.vb:3-46
PolicyPlus/LanguageOptions.Designer.vb:6-94
PolicyPlus/LanguageOptions.vb:4-21
PolicyPlus/ListEditor.Designer.vb:6-112
PolicyPlus/ListEditor.vb:4-48
PolicyPlus/LoadedAdmx.Designer.vb:6-92
PolicyPlus/LoadedAdmx.vb:3-24
PolicyPlus/LoadedProducts.Designer.vb:6-186
PolicyPlus/LoadedProducts.vb:2-68
PolicyPlus/LoadedSupportDefinitions.Designer.vb:6-104
PolicyPlus/LoadedSupportDefinitions.vb:3-29
PolicyPlus/Main.Designer.vb:6-15

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-4434921464156402/job.json
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
- businessrule-92351500174692772734, dropped because Review: merged or a display mechanism, not a rule
  {"id":"businessrule-92351500174692772734","says":"Pressing Enter in a product list opens the selected product's details and marks the key as handled.","decidedAt":{"file":"PolicyPlus/LoadedProducts.vb","firstLine":63,"lastLine":68},"evidence":[]}
- businessrule-84955673267095183184, dropped because Review: merged or a display mechanism, not a rule
  {"id":"businessrule-84955673267095183184","says":"The loaded definition files list shows each file's name, folder and namespace; the namespace column fills the remaining width and is never narrower than 30.","decidedAt":{"file":"PolicyPlus/LoadedAdmx.vb","firstLine":19,"lastLine":21},"evidence":[]}
- businessrule-36793753377238405445, dropped because Review: merged or a display mechanism, not a rule
  {"id":"businessrule-36793753377238405445","says":"Typing in the filter re-lists definitions only once the dialog is visible, not while it is still being set up.","decidedAt":{"file":"PolicyPlus/LoadedSupportDefinitions.vb","firstLine":23,"lastLine":26},"evidence":[]}
