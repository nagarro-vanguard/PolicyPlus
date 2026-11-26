---
name: plan-modernization-backlog
description: Turns a finished code analysis, the decided target and a short typed request into a strictly ordered, phase-wise modernization plan: the layers and decisions of the target codebase, then epics and stories that cover every action and rule of the existing system exactly once, written for the product owner and the developer. Nothing is planned beyond what the analysis shows.
argument-hint: <modernization request file>
---

# Plan Modernization Backlog

Goal: a plan people read phase by phase, complete (every capability, surface, action and rule is in a story or an explicit decision) and true (every criterion rests on rules, state changes or decisions). Read the analysis and plan; never run the legacy or change code.

Words: an *epic* is one chosen journey of the target (or an area without one); a *story* is a slice of an epic with the components that carry it, its criteria and the legacy rules it builds; a *phase* is a level of the component graph. The plan is a set of files, written for the reader; it is tied to no tracker.

## How to run

`${SKILL_ROOT}` is this skill's folder; `${ROOT}` is the Output Root. The analysis must already be in `${ROOT}/.code-analysis/payloads`.

1. `bun ${SKILL_ROOT}/cli/read-request.ts <request file>`; on exit 1, stop with its message (an empty Target Stack is one). It prints the Output Root. Its `--help` lists the request's sections; `## Goals` (what the new system must achieve, one `- ` line each, numbered from 1 by their order) is the person's own words, kept in `request.json` and read by the target and by this plan: one `goal` decision per goal (P1), every goal carried by at least one story criterion (P2). `## Additional Notes` is refused with a message that says to move each line under `## Goals`. Editing a goal runs the target and the plan again.
2. Run the two stages in order, each with `S=MODERNIZATION_ROOT=${ROOT} bun ${SKILL_ROOT}/cli/stage.ts`: `S prepare foundation`, then drive it, then `S finish foundation`, then `S prepare stories`, drive it, `S finish stories`.
3. Driving a stage: `S next --limit 4` prints one action as JSON.
    - `dispatch`: run every agent in `agents` in parallel, each as a subagent sent its `prompt` word for word; report each with `S done <job>` (`S abandon <job>` if it crashed); then call `next` again.
    - `wait`: a batch is open; wait for its agents, report them, call `next`.
    - `done`: the stage's jobs are all decided; run `finish`.
    - `stop`: a job was refused; show its message to the person and stop.
    A job runs write, gate, review and at most one fix; a challenge that survives the fix stays as disputed and is carried into the plan's `conflicts`. Nothing waits for anyone: assumptions are in each decision's `reason`.
4. `bun ${SKILL_ROOT}/cli/plan.ts build ${ROOT}` derives the plan from the accepted records and checks every gate. On exit 1 it prints each failing gate; run the stage that owns the gap again with `prepare`. On success it writes `plan.json`, the manifest, the bodies, one readable context for every story (its attachment) and the AGENTS.md previews.
5. Tell the person what was written and where the plan's pages are (the app builds them). How the plan reads is `${SKILL_ROOT}/rules/presentation.md`; what the agents write is `${SKILL_ROOT}/rules/stories.md`.

## The decided target

The plan is made from the decided target (`${ROOT}/target/architecture.json` and `journeys.json`, with the four choices written by shape-target's `decide.ts`, current by shape-target's own rule read from its `shared/gates.ts`); `prepare` and `plan.ts build` stop and name what does not hold, and refuse a run with no target. The analysis supplies coverage only. Epics are the chosen journeys, and areas for technical work; a story is a slice of a journey, or an enabling story for the parts several journeys rely on; phases are levels of the component graph and blockers are the calls between components. The foundation stage has no `scope` job (what is not carried was dropped, step by step, in the journeys). The stories stage has `shared` jobs, one per group of whole units of parts of the same kind, and one `journey` job per journey. What an epic and a story are is `${SKILL_ROOT}/rules/stories.md`.

## Stages

- Foundation (`foundation`): `decide-foundation` for the layers, outside systems, scope, goals and base areas; `create-stories` for the technical stories of the foundation.
- Stories (`stories`): `create-stories` for the shared parts and for each journey; `review-planned-stories` reads every job.

## Output

`${ROOT}/.modernization-backlog/payloads/plan.json`; `${ROOT}/work-items/` with `manifest.json`, `bodies/`, `attachments/` (a story's context: the story, then the evidence to build it) and `agents-md/` (the guidance of each layer). Every build removes the bodies and attachments of stories that left the plan. `plan.json` keeps what it was built from (`builtFrom`: the analysis's fingerprint and the hash of each decision's subject) and `goalsSha`, the sha256 of the request's goals list as the plan was finished (written by the tool, never by an agent); `plan.ts status ${ROOT}` says whether that still holds. It also carries the reviewers' challenges that survived (`conflicts`), the target's and its own, and each story's layers. `cli/stage.ts status` says where every job stands.
