# Review sheet: the life of Program setting

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/ConfigurationStorage.vb:6-6
PolicyPlus/ConfigurationStorage.vb:15-15

## Read besides the findings
- what the job's agent worked from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/brief.json
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capability-rules/jobs/job-9942896204737316/job.json

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

