# Review sheet: the external systems

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- external-76952632453450489524
- external-75125161121246095518
- external-29531700766871564844
- external-52206529630390924742

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmlFile.vb:16-16
PolicyPlus/AdmxBundle.vb:20-62
PolicyPlus/AdmxFile.vb:18-20
PolicyPlus/CmtxFile.vb:83-91
PolicyPlus/ConfigurationStorage.vb:1-1
PolicyPlus/ConfigurationStorage.vb:4-19
PolicyPlus/DownloadAdmx.vb:39-44
PolicyPlus/DownloadAdmx.vb:52-75
PolicyPlus/DownloadAdmx.vb:79-80
PolicyPlus/ExportReg.vb:8-13
PolicyPlus/FilterOptions.vb:155-157
PolicyPlus/ImportSpol.vb:4-4
PolicyPlus/ImportSpol.vb:7-7
PolicyPlus/InspectPolicyElements.vb:189-189
PolicyPlus/Main.vb:335-336
PolicyPlus/Main.vb:448-461
PolicyPlus/OpenAdmxFolder.vb:43-43
PolicyPlus/OpenUserGpo.vb:1-8
PolicyPlus/OpenUserGpo.vb:22-22
PolicyPlus/OpenUserRegistry.vb:8-15
PolicyPlus/PolicyLoader.vb:18-19
PolicyPlus/PolicyLoader.vb:23-29
PolicyPlus/PolicyLoader.vb:67-70
PolicyPlus/PolicyLoader.vb:83-96
PolicyPlus/PolicySource.vb:27-64
PolicyPlus/PolicySource.vb:358-405
PolicyPlus/RegFile.vb:113-183

## Read besides the findings
- what the agent worked from: its rules and what it read: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/job-0768730624796273/brief.md
- the entries the Map jobs wrote: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/written.jsonl
- the registry as written: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/externalSystems.jsonl

## What this stage's findings are known for
# Review checklist: The Map's registries

Every Map job places each piece of code by one code kind and each link out by one external system, choosing only from these registries; only this review sees a whole registry. An entry claims every piece its `membershipRule` admits, across every part and language; an external system claims every place that reaches it. Judge each against the entries written in `jobPath`, the rules in `rulesPath` and the facts in `briefPath`: place units from every kind of file in every part by the registry alone, as a Map job would.

## Wrong

- An entry point the system's own code starts (for example a procedure the application runs, a handler it calls): it cuts that code's flow short.
- One external system written twice (for example one gateway two programs reach at one address), or several lumped into one; one address serving two systems written as one; a service whose code is in scope written as an external system instead of a part; a data store the code saves to or reads with no entry, because its schema is in scope; a `reachedThrough` naming code whose source is in scope.
- One code kind split by where it lives or by the language it is written in; two whose `membershipRule` admit the same piece; one named by the code's own marker instead of what it does; one its cited lines are not.
- A code kind in a layer it is not; a layer no code kind sits in.
- In the merge, once every Map job is decided: a written entry merged into one that is not the same thing, or a duplicate left as written.

## Missing

- A code kind or external system a piece in `jobPath` needs, with no entry.
- A way of reaching an external system `jobPath` shows (an address, a settings key, a client) missing from its `membershipRule`.
- A fact in `briefPath` the registry contradicts, left unnamed: the Map would be given two rules.

