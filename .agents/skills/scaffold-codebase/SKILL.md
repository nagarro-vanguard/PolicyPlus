---
name: scaffold-codebase
description: Scaffolds the target codebase from the modernization plan - the AGENTS.md files, templates and ignore rules, one tooling job per layer - and checks the result is ready for delivery. Runs in the worktree of the scaffold work item.
argument-hint: <Output Root> <work tracking file>
---

# Scaffold Codebase

Goal: a target codebase that `shape-and-deliver` can build in from its first story: every layer a folder with its AGENTS.md, its tooling pinned and a check that passes on the empty layer. Write tooling and smoke tests only; never product code, and never edit an AGENTS.md (each is a projection of the plan's records).

## How to run

`${SKILL_ROOT}` is this skill's folder; `<Output Root>` is the modernization root holding `.modernization-backlog/` and `work-items/`. Run from the git worktree of the scaffold work item.

1. `bun ${SKILL_ROOT}/cli/scaffold.ts workspace <Output Root> --work-tracking <file>` writes the root AGENTS.md (its `## Work tracking` taken from `<file>`), every layer's folder and AGENTS.md, `templates/` (never overwriting) and the `.artifacts/` ignore line, into the plan's target folder. It is idempotent, refuses to write outside the target, and reports, without writing, any AGENTS.md whose content differs (`--force` overwrites).
2. `bun ${SKILL_ROOT}/cli/scaffold.ts layers <Output Root>` prints the layers in dependency order as JSON. For each, in that order, dispatch one `scaffold-layer` agent (`${SKILL_ROOT}/agents/scaffold-layer.md`) with `targetFolder`, `layerJob` (that layer's JSON) and, when the person gave feedback, `customInstructions`. A layer that depends on another waits for it.
3. `bun ${SKILL_ROOT}/cli/scaffold.ts ready <Output Root>` runs the readiness check and prints `ok` or one problem per line (exit 1). Layer checks that exit 69 are reported as an unavailable environment, not as a defect. Give each problem's layer a new `scaffold-layer` run with the problem as `customInstructions`, then check again.

When it prints `ok`, tell the person the scaffold is ready; it needs git, Bun and network access (versions are pinned with the package manager's exact-pin option).
