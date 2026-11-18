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
    - `wait`: tell the person its `message`; call `next` again when they say it is done.
    - `stop`: tell the person its `message` and stop. `done`: say so.
3. A step runs again only when its inputs changed: its inputs' fingerprint is kept in `<root>/state.json`, with the repository's default branch, the worktrees folder and a limit of one worktree at a time.

## Order

request, analysis request, analysis, bundles, foundation, stories, plan, app, then the person's review; then the epics are created in order, the scaffold, and every story in sequence. The conductor writes nothing in the tracker or the target codebase.
