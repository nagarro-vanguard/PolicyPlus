---
name: modernization
description: Conducts a modernization from a typed request: it checks the request, has the code analysis made, the plan written and shown in the app, then takes the person through creating the work items, scaffolding the codebase and delivering each story. It decides the order and checks that each step's files exist; it never does a step's work itself.
argument-hint: <modernization request file>
---

# Modernization

The skills never invoke each other; this one tells whoever drives it which to invoke next. `${SKILL_ROOT}` is this skill's folder.

## How to run

1. `bun ${SKILL_ROOT}/cli/next.ts --root <Output Root> --request <request file>` the first time, then `--root` alone. It prints one action as JSON and remembers the request.
2. Act on it, then call it again:
    - `run`: run its `command`; if it passes, `next.ts --root <root> --done <step>`; on a failing exit, tell the person what it printed and stop.
    - `invoke`: run that skill as its `instruction` says; when it is finished, `--done <step>`.
    - `prompt`: show the person its `text` (a command that prints the prompt) and `why`; the person pastes it. Nothing here creates a work item or merges anything for them.
    - `wait`: tell the person its `message` (the four decisions of the target wait here: show them the pages the message names, then they confirm with the command it names or ask for a change, which is the `--changes` command the message names; the next call then returns `invoke` to apply it with shape-target's `apply-changes`, drive the jobs and finish the stage); call `next` again when they say it is done, no `--done` is needed for a decision. A decision holds while the proposal it decides on still has the hash its record kept (`subject`), and the decision before it holds and was confirmed no later; a record made before hashes were kept is judged by time (not older than its proposal, which was made after the decision before it) until it is confirmed again. The rule is shape-target's, read from its `shared/gates.ts`. When one changes, every step after it runs again; once work items exist the run stops instead, since created items are locked.
    - `stop`: tell the person its `message` and stop. `done`: say so.
3. A step runs again only when its inputs changed (the request step's input is the request file, so an edited request is read again; a change to its `## Goals` alone runs nothing after it, since no step reads them): its inputs' fingerprint is kept in `<root>/state.json`, with the repository's default branch, the worktrees folder and a limit of one worktree at a time. The fingerprint is the plan skill's shared function (`shared/read/fingerprint.ts`), so both count the same files. The plan step also runs again when `plan.json`'s `builtFrom` differs from the analysis and the decisions that hold now. The app's build runs compose first with the same folders (payloads, target, plan) into `<root>/case`, the one folder the app reads, and gets `BUILD_BUNDLE`, the command that writes a fuller text of a capability, for its assistant copy. The pages of a decision are built from the analysis alone, since compose reads a target only once it is finished.

## Order

request, analysis request, analysis, bundles, the legacy words, then the target, four decisions each in three steps (the stage proposes, the app's pages are built to show the proposal, the person confirms): today's tasks (no agent: `derive.ts current` reads the analysis's journeys, which its Publish wrote with the rest of the analysis, and a run made before that keeps the tasks it has); the journeys, one for each task; the architecture, one; its components, then foundation, stories, plan, app and the person's review; then the epics are created in order, the scaffold, and every story in sequence. The conductor writes nothing in the tracker or the target codebase.
