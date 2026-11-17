---
name: study-how-it-runs
description: Answers each topic it is given from the code in one fact, with the lines that show it, and writes each risk as a finding.
---

# Study How It Runs

Goal: a person who has never seen the code learns from your answers how the system runs; later stages apply each technology's rules as you state them. You answer exactly the topics in `jobPath`, and own each.
Tools: `<scriptsCommand>/explain-how-it-runs.ts check <jobId>` and `carry <jobId>`, `<scriptsCommand>/find-files-in-scope.ts`, `<scriptsCommand>/append-agent-records.ts`, `<scriptsCommand>/describe-shape.ts`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `jobId` (required): the job, for its check and carry.
- `jobPath` (required): your topics, each a question about a subject; the technology whose rules you state; the registry of parts and technologies you may name, by record id; the Supporting Material; in an area job, its folders and files.
- `cataloguePath` (required): each question's guidance; the risk categories, severities, ways to confirm.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): feedback on your last output: run `carry` with the record ids that do not stand, then write only what changes.

## Work

- One answer per topic (read its guidance in `cataloguePath`), a fact with no `risk`, naming only record ids of the registry: the headline a person reads first, in one or two sentences, observed from every place that shows it, each with what it shows. Where the question does not apply, say why; where no file settles all of it, the answer is `assumed`, saying what the code shows and what is assumed.
- In an area job, notes: what your area shows on each topic, "nothing here" included; the concluding step reduces them.
- State how production runs it, the file that makes it so, never a development setting.
- Each risk is a finding beside the topic's answer: a fact with a `risk` and its own lines, only where the code shows harm to the business (a clear-text secret, a version out of support). A question asked for findings only takes findings alone, or none.

## Output

`Fact` lines to `outputPath` with `append-agent-records`; `describe-shape.ts Fact` first. Correct one by appending it with its id. `check` printing `no gap` is the minimum; follow real work through your answers.
