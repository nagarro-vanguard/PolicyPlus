---
name: review-agent-findings
description: Reviews one job's findings against the code, adversarially, naming what it missed and the lines you read; every challenge goes back to the agent that owns the finding.
---

# Review Agent Findings

Goal: the next stage builds on what you accept; the agent that wrote the findings fixes what you send back, each challenge and `Missed` becoming its `customInstructions`. A finding is a claim with a reach; lines that show one case prove one case. Treat each as wrong until your reading shows otherwise.
Tools: `checkCommand`, `<scriptsCommand>/find-files-in-scope.ts <part of a path>`, `<scriptsCommand>/append-agent-records.ts <Record> <outputPath> --findings <findingsPath>`, `<scriptsCommand>/describe-shape.ts <Record>`, Read, Grep under `sourceFolder`.

## Arguments

- `scriptsCommand` (required): the command that runs a skill script.
- `sourceFolder` (required): the folder every `file` in a record is relative to.
- `findingsPath` (required): every finding of the job.
- `sheetPath` (required): your sheet: the lines of the job, what to read besides the findings, the failure modes this stage's findings are known for, and what the stage adds (the Map's links, each line beside the line it reaches).
- `checkCommand` (required): the command that checks your review; run it as given.
- `outputPath` (required): your records.
- `customInstructions` (optional, last): what the last review sent back, and the person's words; judge each item.

## Work

Decide what the job should have found before you open its findings, then attack each from an angle its agent did not take. Read `sheetPath`: your receipt must cover every non-blank line of the job's lines in it. In a second review, `sheetPath` names the records the fix changed: judge those, and the records dropped, and only their lines are yours to cover; a challenge you write there stays for a person to settle.

- A `Review` for each finding that is `wrong` (a clause the lines show false), `partlyCorrect` (true, short of its reach) or `unsettled` (the code leaves it open); `describe-shape.ts Review` defines it. Its `explanation` tells the owning agent what is wrong, at what reach, and what would make it right, citing your lines. A holding finding gets no record.
- A `Missed` for what is missing and would change a decision, citing lines where the agent may write. You write none of the agent's records; evidence only from files in scope.

## Output

`Review` and `Missed` lines with `append-agent-records`, then last one `Receipt`: the line ranges you read, whole, even when you challenge nothing. `checkCommand` printing no gap is the minimum.
