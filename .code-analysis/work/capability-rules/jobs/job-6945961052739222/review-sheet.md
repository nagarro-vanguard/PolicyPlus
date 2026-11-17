# Review sheet: the life of Policy setting

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- lifecycle-31121928221385551983
- transition-89785094540074943220
- transition-61535191739544516515
- transition-69213906522153093707
- fact-42752523313272505897
- fact-25590857187065118278
- receipt-70362847754772185961
- transition-03504227655857642763
- transition-28586412473524388151
- transition-26613972931449063005
- transition-36003202958941971001
- transition-86854366096710212700
- transition-06993145714898877588
- transition-33704110296403444171
- transition-52299936452923107240
- transition-32559124709816975085
- transition-08502660900567048035
- transition-80073164945893311280
- transition-09483528315266661636
- transition-12227774803463809851

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/EditPol.vb:170-235
PolicyPlus/ExportReg.vb:20-32
PolicyPlus/ImportReg.vb:30-42
PolicyPlus/Main.vb:725-737
PolicyPlus/PolicyLoader.vb:1-215
PolicyPlus/PolicyProcessing.vb:240-270
PolicyPlus/PolicyProcessing.vb:322-370
PolicyPlus/PolicySource.vb:1-430
PolicyPlus/RegFile.vb:1-30
PolicyPlus/RegFile.vb:100-275

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-6945961052739222/job.json

## What this stage's findings are known for
# Review checklist: An entity's life

Every rule that allows or refuses a change of state is attached to this life's transitions, and the entity's page shows the life to people deciding about the system. A life claims every state its entity's records can be in, and every place in the whole system that changes one; a state claims every value the code writes for it.

## Wrong

- A state made from one value that is no state of the business: a typo, a test or seed value, a default the code overwrites at once.
- One state written twice under two names, or two states merged into one where the code acts on them differently.
- A state read from several fields together (a date set, a flag cleared) written as if one field held it.
- A transition whose lines do not write the state it says, or that names a state the code never reaches from where it starts.

## Missing

- A save, among those the job lists or its file of uses holds, that changes the state with no transition, above all one whose fields the Map never recorded.
- A change of state written at a save no entry point reaches, without saying the system never makes it as it runs.
- A transition made by code no entry point reaches (a trigger, a listener, a job run on a schedule), which a chain never shows.
- A state set only in data or configuration outside the code, with no assumption saying so.

