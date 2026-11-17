# Review sheet: the rules of 60 pieces of code, from InitializeComponent (PolicyPlus/FilterOptions.Designer.vb:23-213)

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- businessrule-16673757793985174580
- businessrule-14954359762284816873
- businessrule-16603220216706712952
- businessrule-46986726779984701308
- businessrule-70680935711145693406
- businessrule-84338137076756671615
- businessrule-78298272876267752064
- businessrule-19820983549680787634
- businessrule-81375167680926342549
- businessrule-18681459676574650746
- businessrule-45789412810444762597
- businessrule-38576423324752091524
- businessrule-90264025777079832213
- businessrule-22789976468177110666
- businessrule-81091386473347416242
- businessrule-58161249698278934849
- businessrule-64126643148326199885
- businessrule-60546482680229197252
- businessrule-02137554848653216832
- businessrule-54306794930022672105
- businessrule-92122252508413894696
- businessrule-37509630398571167436
- businessrule-66642838449786093597
- businessrule-59244477079705653411
- businessrule-73248001776353046865
- fact-42903416666393297285
- receipt-15476297601491926861

The dropped records are listed below.

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmxBundle.vb:11-17
PolicyPlus/AdmxBundle.vb:120-120
PolicyPlus/AdmxBundle.vb:164-175
PolicyPlus/AdmxBundle.vb:193-196
PolicyPlus/FilterOptions.Designer.vb:23-213
PolicyPlus/FilterOptions.vb:4-135
PolicyPlus/FilterOptions.vb:155-158
PolicyPlus/FindById.Designer.vb:6-15
PolicyPlus/FindById.Designer.vb:23-78
PolicyPlus/FindById.vb:14-64
PolicyPlus/FindByRegistry.Designer.vb:6-15
PolicyPlus/FindByRegistry.Designer.vb:23-98
PolicyPlus/FindByRegistry.vb:3-37
PolicyPlus/FindByText.Designer.vb:6-15
PolicyPlus/FindByText.Designer.vb:23-107
PolicyPlus/FindByText.vb:4-73
PolicyPlus/FindResults.Designer.vb:6-15
PolicyPlus/FindResults.Designer.vb:23-135
PolicyPlus/FindResults.vb:11-130
PolicyPlus/ImportReg.Designer.vb:6-15
PolicyPlus/ImportReg.Designer.vb:23-109
PolicyPlus/ImportReg.vb:3-44
PolicyPlus/ImportSpol.Designer.vb:6-15
PolicyPlus/ImportSpol.Designer.vb:23-119
PolicyPlus/ImportSpol.vb:3-40
PolicyPlus/InspectPolicyElements.Designer.vb:6-15
PolicyPlus/InspectPolicyElements.Designer.vb:23-108
PolicyPlus/Main.vb:431-433
PolicyPlus/PolicyProcessing.vb:380-422

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-4351792658477990/job.json
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
- fact-92931928190915220399, dropped because Case sensitivity is settled by the lookup tables in AdmxBundle, now written as a rule
  {"id":"fact-92931928190915220399","subject":{"registry":"capabilities","key":"capability-95522755523734389125"},"aspect":"rules-it-applies","statement":"Whether a typed ID in Find by ID must match letter case depends on how the definitions lookup tables compare text, which is not in these files.","basis":{"assumed":{"why":"The lookup tables are built elsewhere and their comparison setting is not shown here.","confirmWith":"runningSystem","ifWrong":"People might need exact letter case, or case might be ignored, when finding by ID.","evidence":[{"lines":{"file":"PolicyPlus/FindById.vb","firstLine":29,"lastLine":52},"shows":"The ID is looked up directly in dictionaries with no case change."}]}}}
