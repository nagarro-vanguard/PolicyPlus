---
name: plan-modernization-backlog
description: Turns a finished code analysis and a short typed request into a strictly ordered, phase-wise modernization backlog: the layers and decisions of the target codebase, then epics and stories that cover every action and rule of the existing system exactly once, written for the product owner and the developer. Nothing is planned beyond what the analysis shows.
argument-hint: <modernization request file>
---

# Plan Modernization Backlog

Goal: a plan people review step by step and later skills build from, complete (every capability, surface, action and rule is in a story or an explicit decision) and true (every criterion rests on rules, state changes or decisions). Read the analysis and plan; never run the legacy, change code or create work items.

## How to run

`${SKILL_ROOT}` is this skill's folder; `${ROOT}` is the Output Root. The analysis must already be in `${ROOT}/.code-analysis/payloads`.

1. `bun ${SKILL_ROOT}/cli/read-request.ts <request file>`; on exit 1, stop with its message (an empty Target Stack is one). It prints the Output Root. Its `--help` lists the request's sections; the optional `## Goals` (why this modernization, what the target stack must achieve) is the person's text, kept word for word in `request.json` for readers. No agent reads, writes or rewrites it.
2. Run the two stages in order, each with `S=MODERNIZATION_ROOT=${ROOT} bun ${SKILL_ROOT}/cli/stage.ts`: `S prepare foundation`, then drive it, then `S finish foundation`, then `S prepare stories`, drive it, `S finish stories`.
3. Driving a stage: `S next --limit 4` prints one action as JSON.
    - `dispatch`: run every agent in `agents` in parallel, each as a subagent sent its `prompt` word for word; report each with `S done <job>` (`S abandon <job>` if it crashed); then call `next` again.
    - `wait`: a batch is open; wait for its agents, report them, call `next`.
    - `done`: the stage's jobs are all decided; run `finish`.
    - `stop`: a job was refused; show its message to the person and stop.
    A job runs write, gate, review and at most one fix; a challenge that survives the fix stays as disputed and is shown to the person. Nothing waits for the person: assumptions are in each decision's `reason`.
4. `bun ${SKILL_ROOT}/cli/plan.ts build ${ROOT} --work-tracking <the workspace AGENTS.md>` derives the plan from the accepted records and checks every gate. On exit 1 it prints each failing gate; run the stage that owns the gap again with `prepare`. On success it writes `plan.json`, `prompts.json`, the manifest, the bodies, the attachments and the AGENTS.md previews.
5. Tell the person what was written and where the plan's pages are (the app builds them). How the plan reads, and what the agents' titles and criteria must look like, is `${SKILL_ROOT}/rules/presentation.md`.

## With a confirmed target

The target is confirmed when the person's four decisions hold (`target/choice-as-is.json`, `choice-journeys.json`, `choice-architecture.json`, `choice-components.json`: each is not older than the file it decides on, which was made after the decision before it). When `target/` exists and one does not hold, `prepare` and `plan.ts build` stop and name it; a run with no `target/` is planned from the analysis alone.

When `${ROOT}/target/architecture.json` and `target/journeys.json` exist (the `shape-target` skill wrote them), the plan is made from them and the analysis supplies coverage only. Epics are the chosen journeys; a story is a slice of one journey with the components that carry it; a component is built by the journey that alone serves it, otherwise by a shared story in an earlier phase; each journey ends with an acceptance story the plan writes itself; phases are the levels of the component graph and blockers are the calls between components. The foundation stage then has no `scope` job (what is not carried was dropped, step by step, in the journeys), its layers must carry what the architecture is built with, and the stories stage has `shared` and one `journey` job per journey in place of the capability jobs. Without them the plan is made as described below.

## Stages

- Foundation (`foundation`): `decide-foundation` for the layers, outside systems, scope, notes and base areas; `create-stories` for the technical stories of the foundation.
- Stories (`stories`): `create-stories` for the shared rules and for each capability's surfaces; `review-planned-stories` reads every job.

## Output

`${ROOT}/.modernization-backlog/payloads/plan.json` and `prompts.json`; `${ROOT}/work-items/` with `manifest.json`, `bodies/`, `attachments/`, `ledger.json` and `agents-md/`. `cli/stage.ts status` says where every job stands; `cli/ledger.ts` records what is done with a work item; `cli/prompts.ts` prints the prompts.
