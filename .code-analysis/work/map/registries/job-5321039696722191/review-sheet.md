# Review sheet: the code kinds

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- layer-37848672986126044440
- layer-75177229849285610651
- codekind-45306493887724135208
- codekind-45734613194056836242
- codekind-39669601511552010645

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmxStructures.vb:2-9
PolicyPlus/DetailAdmx.Designer.vb:286-290
PolicyPlus/DetailPolicy.Designer.vb:1-3
PolicyPlus/DetailPolicy.vb:1-43
PolicyPlus/EditPol.vb:2-2
PolicyPlus/EditPol.vb:284-290
PolicyPlus/FilterOptions.vb:1-150
PolicyPlus/PInvoke.vb:3-13
PolicyPlus/PolicyProcessing.vb:2-86
PolicyPlus/SpolFile.vb:13-201
PolicyPlus/SpolFile.vb:203-215
PolicyPlus/SystemInfo.vb:3-11

## Read besides the findings
- what the agent worked from: its rules and what it read: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/job-5321039696722191/brief.md
- the entries the Map jobs wrote: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/written.jsonl
- the registry as written: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/map/registries/codeKinds.jsonl

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

