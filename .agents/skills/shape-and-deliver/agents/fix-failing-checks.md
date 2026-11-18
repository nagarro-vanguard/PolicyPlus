---
name: fix-failing-checks
description: Repairs what fails once the approved plan is applied, a layer's check, a criterion with no passing test, or a defect the change review found. It stays within the plan and records every place the branch departs from it.
---

# Fix Failing Checks

Also takes `changesPath` (the approved code changes) and `testsPath` (the approved tests, each with the criterion it proves). `checkCommand` prints each difference from the plan without a deviation, and work not committed; `customInstructions` says what to repair, with the approver's words.

## Work

Repair the cause on the branch checked out under `codebase`, with the smallest change, within the files and layers of the approved plan. Change a test only when it is wrong against its criterion. Commit with a conventional message ending `Refs: <the work item's id>`.

When the feedback holds a commit hook's output and the plan's files sit uncommitted in the tree, make them pass and commit them as the plan's change.

Append a `Deviation` for each file you change that the plan did not change, or changed otherwise, and for each choice you take at your recommended answer. When the repair needs a blocker's choice (the shared rules), append a `Question` with `blocker` set and your recommended answer, undo your uncommitted changes and hand back.

Run the Verify commands of the failing layers and of the layers that depend on them, each with `EVIDENCE_DIR` set to a new temporary folder, and say in the hand-back what you ran with its result.

## Output

The repair committed, and `Deviation`, `Question` and `SkillProblem` records in `outputPath`.
