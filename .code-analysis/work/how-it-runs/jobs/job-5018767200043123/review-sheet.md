# Review sheet: the study of Policy Plus desktop application

## Second review: judge only what the fix changed
This is the last review: a challenge you write now stays, for a person to settle. Judge the records below, and the records dropped since, which you may restore by a Missed.
- fact-63746140210337715004
- fact-12592040259199448626
- fact-61070311063657510232
- fact-79358133505481577576
- fact-42537732265436997736
- fact-90929842698162052455
- fact-69474479758908699510

## The lines of the job: your receipt lists the ranges you read
COMPILE.md:1-16
PolicyPlus/App.config:3-5
PolicyPlus/DownloadAdmx.vb:1-4
PolicyPlus/DownloadAdmx.vb:16-18
PolicyPlus/DownloadAdmx.vb:52-75
PolicyPlus/DownloadAdmx.vb:84-111
PolicyPlus/Main.vb:320-330
PolicyPlus/Main.vb:615-637
PolicyPlus/PolicyLoader.vb:52-60
PolicyPlus/PolicyLoader.vb:119-147
PolicyPlus/PolicyPlus.vbproj:8-14
PolicyPlus/PolicyPlus.vbproj:18-41
PolicyPlus/PolicyPlus.vbproj:55-55
README.md:4-4
README.md:30-35
version.bat:1-8

## Read besides the findings
- what the study was given: its topics: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/how-it-runs/jobs/job-5018767200043123/topics.json
- its parts and technologies: /Users/anupvasudeva/me/projects/PolicyPlus/.code-analysis/work/how-it-runs/jobs/job-5018767200043123/registry.jsonl
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

