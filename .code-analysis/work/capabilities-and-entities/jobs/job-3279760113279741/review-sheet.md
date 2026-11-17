# Review sheet: merging 6 written capabilities, from Using Policy Plus

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/DownloadAdmx.vb:33-130
PolicyPlus/EditPol.vb:113-129
PolicyPlus/EditPol.vb:276-278
PolicyPlus/EditSetting.vb:312-315
PolicyPlus/FindByText.vb:11-73
PolicyPlus/ImportSpol.vb:3-10
PolicyPlus/Main.vb:18-45
PolicyPlus/Main.vb:510-523
version.bat:1-8

## Read besides the findings
- what the job's agent worked from: its rules and what it read: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capabilities-and-entities/jobs/job-3279760113279741/brief.md
- what the job was given: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capabilities-and-entities/jobs/job-3279760113279741/job.json
- the registry it chose from: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/capabilities-and-entities/registry/capabilities.jsonl

## What this stage's findings are known for
# Review checklist: Capabilities and entities

Every entry point's page is named by the capability it is assigned, and every entity's page lists the resources and data shapes assigned to it: a wrong entry or assignment misnames them on every page. What an entry is and how wide it is, `references/registry/capabilities-and-entities.md` says. A seeding job's `jobPath` has `kind` `proposeCapabilities` or `proposeEntities`; a merging job's `mergeCapabilities` or `mergeEntities`; any other is an assigning job.

## Wrong, in a seeding job

- A name the evidence does not show, or a module's, folder's, role's or store's name; two entries of one meaning; a catch-all holding areas the business changes apart.
- An entry at the middle grain: one per controller, menu item, verb or entry point, where they serve one area; one per child, lookup or link table, where they belong to one thing; a report apart from the data it serves.
- A `membershipRule` that admits another entry's members, or leaves its own unrecognisable.

## Wrong, in an assigning job

- A unit given an entry its lines do not meet; a `notBusinessDataReason` on a unit that keeps data the business knows.
- An entry written where one in the registry fits; an entry written at the middle grain above.

## Wrong, in a merging job

- A written entry merged into one that is not the same thing; a duplicate left as written where its entry is in the registry.
- An entry outside the slice reworded.

## Missing

- A capability or kind of data the units show that no entry names.
- Navigation or a purpose in `briefPath` the entries contradict, left unnamed.

