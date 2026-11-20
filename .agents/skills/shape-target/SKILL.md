---
name: shape-target
description: Designs the target of a modernization before it is planned, from a finished code analysis. It reads how people get their tasks done today from the code analysis's journeys, designs two or three better ways of doing each, and two or three architectures split into domains, and has the person confirm one of each. The design is stated in outcomes, steps and domains, so it holds for any stack and any kind of interface.
argument-hint: <Output Root>
---

# Shape Target

Goal: a target the person has chosen, in four confirmed decisions (today's tasks, the journeys, the architecture, its components), complete (every entry point and rule of the old system is in a step, a domain or an explicit drop) and not a copy (nothing of the old system's structure is carried). Read the analysis and design; never plan the work, build, or change code.

## How to run

`${SKILL_ROOT}` is this skill's folder; `${ROOT}` is the Output Root. The analysis must already be in `${ROOT}/.code-analysis/payloads` (with its `journeys.json`, today's tasks) and the request in `${ROOT}/request.json`. `S=MODERNIZATION_ROOT=${ROOT} bun ${SKILL_ROOT}/cli/stage.ts`.

1. `bun ${SKILL_ROOT}/cli/derive.ts legacy ${ROOT}` writes `target/legacy.json`, the old system's own words, kept apart.
2. As-is: `bun ${SKILL_ROOT}/cli/derive.ts current ${ROOT}` reads the analysis's `payloads/journeys.json` (the tasks people get done today, written by the code analysis) into `target/current.json` and `essence.json`, and refuses journeys that do not hold every entry point and rule once; a run whose `target/current.json` exists and whose analysis has no `journeys.json` keeps that file as it is. There are no jobs: `S finish as-is` does the same. Show the person today's tasks (the views the conductor builds before it asks) and take their marks; `bun ${SKILL_ROOT}/cli/choose.ts as-is ${ROOT} --reason <why> [--marks <file>]`. A step marked `wrong` blocks it: the analysis writes the journeys again (its Publish journeys jobs, handed back with the marks), then `derive.ts current` and confirm.
3. Journeys: `S prepare journeys`, drive it, `S finish journeys`. The person compares the variants of each task; `choose.ts journeys ${ROOT} --reason <why> [--all-recommended] [--pick <task>=<variant>] [--accept-disputes]`.
4. Architecture: `S prepare architecture`, drive it, `S finish architecture`. The person compares the variants; `choose.ts architecture ${ROOT} --pick <variant> --reason <why> [--accept-disputes]`.
5. Components: `S prepare components`, drive it, `S finish components`. It runs every check across the chosen architecture and writes `target/architecture.json` only when they pass; on a gap it names it, and the stage's jobs are run again with the gap as instructions. The person reviews the components and confirms: `choose.ts components ${ROOT} --reason <why>`.
6. Tell the person what was written and where the views are (the app builds them).

Every decision is confirmed the same way: the stage proposes, the views show it, the person confirms. Confirming records the sha256 of the file decided on (`subject`) and keeps a copy of it in `target/confirmed/<decision>.json`, so what changed since is found by comparing the two (`shared/since.ts`). A decision is confirmed while that file keeps the hash, the decision before it is confirmed, and that one was confirmed no later than it; touching or copying a file changes nothing. A decision confirmed before hashes were kept has no `subject` and is judged by file times as before (its `choice-*.json` not older than the file it decides on, made after the decision before it) until it is confirmed again. When the person asks for a change, record it with `choose.ts <gate> ${ROOT} --changes <their words> [--task <id> | --domain <name>]` (it withdraws the confirmation) and run `S apply-changes <gate>`, which hands back the jobs with their words; by hand, `redo` the jobs that wrote it (the as-is: the analysis's journeys jobs, `journeys-of-<capability>` and `journeys-merge`, handed back there; journeys: `variants-*`; architecture: `shape`; components: `components-<domain>` and every domain that depends on it) with their words, then `finish` the stage in the same drive, and ask again. `choose` refuses while the decision before it is not confirmed.

Driving a stage: `S next --limit 4` prints one action as JSON.

- `dispatch`: run every agent in `agents` in parallel, each as a subagent sent its `prompt` word for word; report each with `S done <job>` (`S abandon <job>` if it crashed); then call `next` again.
- `wait`: a batch is open; wait for its agents, report them, call `next`.
- `done`: the stage's jobs are all decided; run `finish`.
- `stop`: a job was refused; show its message to the person and stop.

A job runs write, gate, review (for those that have one) and at most one fix; a challenge that survives stays disputed. `finish` writes the disputes of a stage to `.shape-target/work/records/disputes-<stage>.json`, a list of `{ job, record, variant, says }` where `variant` is the journey's id or the architecture's name (schema `dispute.schema.json`; `shared/disputes.ts loadDisputes` reads older files too). `choose.ts` refuses a pick that a dispute is about and prints the disputes: show them to the person, and confirm with `--accept-disputes` and a `--reason` of at least eight words in their own words once they accept them, which records them in the decision. Nothing waits for the person except the four decisions.

## Stages

- As-is (`as-is`): no jobs; the tasks are the analysis's journeys, read by `derive.ts current`.
- Journeys (`journeys`): `propose-journeys` writes variants per task; `challenge-target` reads each.
- Architecture (`architecture`): `propose-architecture` writes variants; `challenge-target` reads them, with script-counted `evidence` per domain in its context. The check refuses a variant in which a step's data is out of reach of the domains that decide it (their own data and that of the domains they depend on directly), and the final check counts only components that carry a step, never one that only keeps data. `prepare` puts a stage's earlier job outputs in `work/archive/` so a writer never starts from an old draft.
- Components (`components`): `propose-architecture` writes the components of each domain of the chosen variant, in dependency order.

## Output

`${ROOT}/target/`: `legacy.json`, `current.json`, `essence.json`, `choice-as-is.json`, `journeys.json`, `choice-journeys.json`, `choice-architecture.json`, `architecture.json`, `choice-components.json`, `confirmed/<decision>.json`, and `manifest.json` (`contractVersion` and the sha256 of each file; a run without it is read as it is). Work files are in `${ROOT}/.shape-target/work/`. Each variant carries its views (functional, technical, deployment), and the chosen one the technical view of each domain's components, written by the model and drawn as written. `cli/check.ts` runs the checks on the chosen architecture; `cli/write-schemas.ts` writes the records' schemas.
