---
name: code-analysis
description: Analyses an existing codebase from its code, any stack and any medium. An overview maps the whole system (how it runs, how it is organised, every entry point, what it talks to, its data and capabilities). For the capabilities a person chooses, it then reads every business rule their code decides and the life of the data they change.
argument-hint: <request file>
---

# Code Analysis

Goal: an understanding of an existing codebase that people read step by step and later work builds on, complete (every line in scope read) and true (every finding traced to lines). Read and analyse the code and its supporting material only; never plan the migration, design the target, or change the code.

## How to run

1. `bun ${SKILL_ROOT}/cli/read-analysis-request.ts <analysisRequestPath>`; on exit 1, stop with its message. It prints the analysis root.
2. Run the stages in the order below, each as its stage's `stage.md` says, under `${SKILL_ROOT}/stages/<stage>/`, and `${SKILL_ROOT}/shared/jobs/driving.md` says. Every stage is driven by its script's `next`: the scripts decide what runs next, and you dispatch the agents they hand out (each prompt sent word for word, a batch in parallel, each reported with `done <job>`, or `abandon <job>` when it crashes), tell the person every assumption `next` prints as it arrives, and go on: the person is never asked about the code, and the run never waits for them.
3. At each stage's end, tell the person what its `show` prints and go on. Should the person, unasked, correct an assumption, it goes in through that stage's `challenge`, `attach` or `accept-assumptions`, their words on any output through its `prepare --custom-instructions`, and `next` then runs the jobs it rests on again. A stage is run again from nothing with `prepare --fresh`. The run studies every capability (`explain-capability-rules.ts prepare --all`) unless the person names some; it asks them nothing else.
4. When Publish is done, tell the person what its `show` prints: the analysis is the accepted records in `${ANALYSIS_ROOT}`. Then `${SKILL_ROOT}/cli/write-payloads.ts` and `${SKILL_ROOT}/cli/build-ux-visuals.ts` write `payloads/` and `ux-visuals/` beside them, and the person is told where to open `ux-visuals/index.html` (through a static server).

## Stages

This list is the only place the stages' order is written. Each item gives a stage's name, the stage key its scripts use, and nothing else; its steps are in `stages/<stage>/stage.md`.

- Inventory (`inventory`)
- How it runs (`how-it-runs`)
- Map (`map`)
- Capabilities and entities (`capabilities-and-entities`)
- Capability rules (`capability-rules`)
- Publish (`publish`)

## Arguments

| Argument | Required | Description |
| --- | --- | --- |
| `analysisRequestPath` | Yes | A request file; `read-analysis-request.ts --help` lists its sections and which are required |

## Invocation

The request file is the only argument; `read-analysis-request.ts --help` lists its sections:

```text
/code-analysis <path to your request>
```

`${SKILL_ROOT}` is this skill's folder, `.claude/skills/code-analysis/`; `${ANALYSIS_ROOT}` is the analysis root `read-analysis-request.ts` prints, the request's Output Root.
