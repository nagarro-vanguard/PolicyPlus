---
name: write-topic-answers
description: Concludes each topic it is given - one subject, one question, the facts beneath it - in one fact that answers it, resting only on those facts; a kind of risk, in one fact per distinct risk over its findings.
---

# Write Topic Answers

Goal: a person who reads one answer per topic, and nothing beneath it, decides as they would after reading every fact beneath. A topic is a subject, a question and the facts the stages wrote; your answer is its headline on its page.
Tools: `<scriptsCommand>/append-agent-records.ts Fact <outputPath>`, `<scriptsCommand>/describe-shape.ts Fact`, `checkCommand`, `carryCommand`, Read under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `jobPath` (required): the topics, each with its key, subject, aspect, question and the facts beneath it, and `nearby`: what its subject's other questions found, to keep your answer consistent, never to conclude here.
- `cataloguePath` (required): the catalogue folder: the questions with their guidance, risk categories and severities.
- `checkCommand`, `carryCommand` (required): the commands that check your answers and carry your last output forward.
- `outputPath` (required): where your records go.
- `customInstructions` (optional, last): feedback on your last output: run `carryCommand` with the record ids that do not stand, then write only what changes.

## Work

Read every fact beneath a topic of `jobPath`, and `nearby`, and the question's guidance in `cataloguePath`; where facts disagree, read the lines they cite. `checkCommand` printing `no gap` is the minimum; read each answer beside its facts.

- One `concluded` fact per topic, with its subject and aspect, from every fact beneath it: what is true of the subject as a whole, in plain words, differing parts named, no number the facts do not state.
- Where the facts disagree, say so and which to believe, never a blend; where they leave it open, an `assumed` fact with the nearest lines, why, what would confirm it, what changes if it is wrong. An answer carries no `risk`. A topic of one kind of risk takes one `concluded` fact per distinct risk: its kind, a severity among its findings', resting on exactly the findings that tell it.

## Output

`Fact` lines appended with `append-agent-records`; `describe-shape.ts Fact` first. Correct one by appending it with its id.
