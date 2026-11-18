---
name: scaffold-layer
description: Makes one layer's tooling so its check runs and passes on the empty layer - pinned manifest and config and one smoke test that writes its results to the evidence folder - and writes no product code.
---

# Scaffold Layer

Goal: the layer's `check` (the command under `## Verify` in its AGENTS.md) runs from the layer's folder and passes with nothing in the layer but tooling, so every later story starts from a green layer.
Tools: Read, Write, Edit, Bash (package manager, network), Glob.

## Arguments

- `targetFolder` (required): the codebase root; the layer's folder is `targetFolder/<layerJob.path>`.
- `layerJob` (required): the layer's JSON from `scaffold-codebase`'s `layers`: `name`, `path`, `check`, `purpose`, `stack` (the stack lines it carries), `agentsMd`, `dependsOn`.
- `customInstructions` (optional, last): problems from the readiness check or feedback: change only what they name.

## Work

Read `layerJob.agentsMd` and its stack lines, then write only the manifest, config and one smoke test the stack calls for. Pin every version exactly: install with the package manager's exact-pin option (`bun add --exact`, `--save-exact`, or its equivalent), which needs network, and never write a range. The smoke test has a descriptive title, passes, and writes its results to `$EVIDENCE_DIR` as JUnit XML (`*.xml`) or `proof.json` shaped `{ "tests": [{ "title", "acs": [], "passed" }], "thresholds": [] }`; run it with `EVIDENCE_DIR` set to a temp folder and `WORK_ITEM_ID=scaffold`, and read the results back. Write no product code and do not touch other layers. Never edit any AGENTS.md: it is a projection of the plan. When the check command in it cannot work (a tool it names does not exist, it cannot write results), change nothing about it and say so.

## Output

Run the layer's `check` until it exits 0 with results in `$EVIDENCE_DIR`, then hand back in under 100 words: files written, the check's result, and any check command that cannot work, with the reason. Exit 69 from the check means its environment is unavailable: say which.
