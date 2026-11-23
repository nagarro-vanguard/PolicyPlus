---
name: modernization
description: Conducts a modernization from a typed request up to its plan: it checks the request, has the code analysis made, designs and decides the target (today's tasks, the journeys, the architecture, its components), has the plan written, and builds the app that shows the analysis, the target and the plan. It decides the order and checks that each step's files exist; it never does a step's work itself, and it never asks anyone to confirm anything.
argument-hint: <modernization request file>
---

# Modernization

The skills never invoke each other; this one tells whoever drives it which to invoke next. `${SKILL_ROOT}` is this skill's folder.

## How to run

1. `bun ${SKILL_ROOT}/cli/next.ts --root <Output Root> --request <request file>` the first time, then `--root` alone. It prints one action as JSON and remembers the request.
2. Act on it, then call it again:
    - `run`: run its `command`; if it passes, `next.ts --root <root> --done <step>`; on a failing exit, tell the person what it printed and stop.
    - `invoke`: run that skill as its `instruction` says; when it is finished, `--done <step>`.
    - `stop`: tell the person its `message` and stop. It names what cannot go on (an empty request, a missing analysis, a stage whose final checks failed three times).
    - `done`: say so. The plan and the app that shows it are made.
3. The four decisions of the target are made by the conductor itself: after a stage proposes, a `run` step records the decision (`shape-target/cli/decide.ts`), the same way every time. A decision holds while the proposal it decides on still has the hash its record kept (`subject`), and the decision before it holds and was made no later; a record made before hashes were kept is judged by time (not older than its proposal, which was made after the decision before it) until it is decided again. The rule is shape-target's, read from its `shared/gates.ts`. When one changes, every step after it runs again. To change a decision, hand the stage's jobs back with new instructions (shape-target's `redo`) and call `next` again.
4. A step runs again only when its inputs changed (the request step's input is the request file, so an edited request is read again; a change to its `## Goals` alone runs nothing after it, since no step reads them): its inputs' fingerprint is kept in `<root>/state.json` (the request and the steps). The fingerprint is the plan skill's shared function (`shared/read/fingerprint.ts`), so both count the same files. The plan step also runs again when `plan.json`'s `builtFrom` differs from the analysis and the decisions that hold now. The app's build runs compose first with the same folders (payloads, target, plan) into `<root>/case`, the one folder the app reads, and gets `BUILD_BUNDLE`, the command that writes a fuller text of a capability, for its assistant copy.

## Order

request, analysis request, analysis, the payloads (written again by script when their manifest is missing or follows another contract version; the store's folder is the Output Root's `.code-analysis`, or the one `cli/locate-analysis.ts <root> <folder>` noted), bundles, the legacy words, then the target, four decisions each in two steps (the stage proposes; the decision is recorded from the proposal): today's tasks (no agent: `derive.ts current` reads the analysis's journeys, which its Publish wrote with the rest of the analysis, and when the analysis holds no journeys the step stops and says to run Publish again, unless the decision is already made); the journeys, one for each task; the architecture, one; its components; then foundation, stories, plan and app. The conductor writes nothing outside the Output Root and touches no tracker, branch or codebase.
