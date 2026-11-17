# Review sheet: the study of .NET Framework

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- fact-17010206963848736479
- fact-04778930488503450393
- fact-02281209187153212575
- fact-48835083324999731847
- fact-67374956797143889814
- fact-99632587527307990724
- fact-42595514144781188630
- fact-50067563093449208907
- fact-87976621935764415381
- fact-44328994184714585634
- fact-21818934497368295725
- fact-49630762293811456731
- fact-43193911611514899391
- fact-36408208651050681334

## The lines of the job: your receipt lists the ranges you read
PolicyPlus/AdmlFile.vb:11-11
PolicyPlus/AdmxFile.vb:14-14
PolicyPlus/AdmxStructures.vb:2-55
PolicyPlus/App.config:1-5
PolicyPlus/CmtxFile.vb:7-7
PolicyPlus/CompiledStructures.vb:2-29
PolicyPlus/ConfigurationStorage.vb:3-19
PolicyPlus/DownloadAdmx.vb:3-4
PolicyPlus/DownloadAdmx.vb:37-49
PolicyPlus/DownloadAdmx.vb:67-72
PolicyPlus/DownloadAdmx.vb:82-91
PolicyPlus/DownloadAdmx.vb:96-99
PolicyPlus/EditSetting.vb:19-21
PolicyPlus/Main.vb:8-8
PolicyPlus/Main.vb:18-50
PolicyPlus/Main.vb:55-60
PolicyPlus/Main.vb:478-478
PolicyPlus/Main.vb:517-517
PolicyPlus/Main.vb:809-809
PolicyPlus/OpenUserRegistry.vb:6-12
PolicyPlus/PInvoke.vb:3-13
PolicyPlus/PolicyLoader.vb:63-70
PolicyPlus/PolicyLoader.vb:131-131
PolicyPlus/PolicyPlus.vbproj:9-9
PolicyPlus/PolicyPlus.vbproj:14-14
PolicyPlus/PolicyPlus.vbproj:18-18
PolicyPlus/PolicyPlus.vbproj:30-30
PolicyPlus/PolicyPlus.vbproj:322-322
PolicyPlus/PolicyStructures.vb:2-17
version.bat:1-8

## Read besides the findings
- what the study was given: its topics: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/how-it-runs/jobs/job-5768310990242016/topics.json
- its parts and technologies: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/how-it-runs/jobs/job-5768310990242016/registry.jsonl
- the catalogue: /Users/anupvasudeva/me/projects/PolicyPlus/.agents/skills/code-analysis/shared/catalogue

## What this stage's findings are known for
# Review checklist: How It Runs

Each fact answers one topic its job was given (`jobPath`): one question about one part or technology, which this job alone answers, in one answer, a fact with no `risk` (the gate refuses a second); each harm the code shows is a finding of its own, a fact with a `risk`, beside the answer. Never ask for a second answer on a topic: where part of an answer rests on what no file settles, ask for the whole answer to be `assumed`, its statement saying what the code shows and what is assumed; where it rests on knowledge from outside the code, ask for `externalSource`. A technology job states the rules later stages apply across the code; an area job writes notes on one area of a large part, which the concluding step reduces. A entry-point rule claims every piece it admits across the code, not only the pieces it was written from.

## Wrong

- A fact the cited lines do not show, or a place whose `shows` they do not show; a rule true where it is cited and broken elsewhere in the code.
- A setting or behaviour of development or test stated as how the system runs: ask which configuration production reads, and what makes it so.
- A entry-point rule that admits code that is not an entry point, or excludes one that is; above all a piece the system's own code starts (for example a procedure the application runs, a handler it calls), which a framework may see as an entrance.
- An `assumed` fact the code does settle; a fact saying a question does not apply when the code shows it does.
- A `risk` for what merely might go wrong, one its lines do not show, or one resting on knowledge from outside the code that its `externalSource` does not label.
- A statement that is not a headline: counts and lists a person reads past, a number that changes no decision, a name only the code uses.
- An area job's note about code outside its area, stated as if it were the area's.
- Two facts of the job that contradict each other: challenge both, each citing the other's lines.
- A statement resting on a code comment, a name or a test page rather than on what the code does as production runs it.
- A harm stated at a reach its lines do not show: every install, every customer, anyone holding the code.

## Missing

- An answer that covers some of the topic's subject and not the rest: a part's other entry point, a second schedule, another environment's start.
- An exception to the entry-point rule (for example a fallback, a prefix, a hook that runs first).
- An external system the code reaches that no fact names, including through code it loads at run time whose source is in scope (for example plugins, providers).
- A way of writing code this technology uses, in the standard way or not (for example an inline script in a view, a hand-rolled dispatcher), that no fact covers.
- Something that runs around all incoming work.
- A risk this code plainly shows (a secret written in clear text, a check a rebuild could drop) with no finding of its own, or merged into an answer.
- Unsafe handling of what comes from outside, whichever question it falls under or none: a value pasted into a query or a command, a path or address the caller gives, a check one entry point skips.

