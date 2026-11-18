---
name: shape-target
description: Designs the target of a modernization before it is planned, from a finished code analysis. It describes how people get their tasks done today, designs two or three better ways of doing each, and two or three architectures split into domains, and has the person confirm one of each. The design is stated in outcomes, steps and domains, so it holds for any stack and any kind of interface.
argument-hint: <Output Root>
---

# Shape Target

Goal: a target the person has chosen, in four confirmed decisions (today's tasks, the journeys, the architecture, its components), complete (every entry point and rule of the old system is in a step, a domain or an explicit drop) and not a copy (nothing of the old system's structure is carried). Read the analysis and design; never plan the work, build, or change code.

## How to run

`${SKILL_ROOT}` is this skill's folder; `${ROOT}` is the Output Root. The analysis must already be in `${ROOT}/.code-analysis/payloads` and the request in `${ROOT}/request.json`. `S=MODERNIZATION_ROOT=${ROOT} bun ${SKILL_ROOT}/cli/stage.ts`.

1. `bun ${SKILL_ROOT}/cli/derive.ts legacy ${ROOT}` writes `target/legacy.json`, the old system's own words, kept apart.
2. As-is: `S prepare as-is`, drive it, `S finish as-is`. Show the person today's tasks (the views the conductor builds before it asks) and take their marks; `bun ${SKILL_ROOT}/cli/choose.ts as-is ${ROOT} --reason <why> [--marks <file>]`. A step marked `wrong` blocks it: hand the jobs back with `redo <job> --instructions <the marks>`, finish, confirm.
3. Journeys: `S prepare journeys`, drive it, `S finish journeys`. The person compares the variants of each task; `choose.ts journeys ${ROOT} --reason <why> [--all-recommended] [--pick <task>=<variant>]`.
4. Architecture: `S prepare architecture`, drive it, `S finish architecture`. The person compares the variants; `choose.ts architecture ${ROOT} --pick <variant> --reason <why>`.
5. Components: `S prepare components`, drive it, `S finish components`. It runs every check across the chosen architecture and writes `target/architecture.json` only when they pass; on a gap it names it, and the stage's jobs are run again with the gap as instructions. The person reviews the components and confirms: `choose.ts components ${ROOT} --reason <why>`.
6. Tell the person what was written and where the views are (the app builds them).

Every decision is confirmed the same way: the stage proposes, the views show it, the person confirms. A decision is confirmed while its `choice-*.json` is not older than the file it decides on and that file was made after the decision before it; when the person asks for a change, `redo` the jobs that wrote it (the as-is: `tasks-*` and `merge`; journeys: `variants-*`; architecture: `shape`; components: `components-<domain>` and every domain that depends on it) with their words, then `finish` the stage in the same drive, and ask again. `choose` refuses while the decision before it is not confirmed.

Driving a stage: `S next --limit 4` prints one action as JSON.

- `dispatch`: run every agent in `agents` in parallel, each as a subagent sent its `prompt` word for word; report each with `S done <job>` (`S abandon <job>` if it crashed); then call `next` again.
- `wait`: a batch is open; wait for its agents, report them, call `next`.
- `done`: the stage's jobs are all decided; run `finish`.
- `stop`: a job was refused; show its message to the person and stop.

A job runs write, gate, review (for those that have one) and at most one fix; a challenge that survives stays disputed and is shown to the person. Nothing waits for the person except the four decisions.

## Stages

- As-is (`as-is`): `describe-current` finds the tasks per capability and joins duplicates; `challenge-target` reads each.
- Journeys (`journeys`): `propose-journeys` writes variants per task; `challenge-target` reads each.
- Architecture (`architecture`): `propose-architecture` writes variants; `challenge-target` reads them.
- Components (`components`): `propose-architecture` writes the components of each domain of the chosen variant, in dependency order.

## Output

`${ROOT}/target/`: `legacy.json`, `current.json`, `essence.json`, `choice-as-is.json`, `journeys.json`, `choice-journeys.json`, `choice-architecture.json`, `architecture.json`, `choice-components.json`. Work files are in `${ROOT}/.shape-target/work/`. `cli/check.ts` runs the checks on the chosen architecture; `cli/write-schemas.ts` writes the records' schemas.
