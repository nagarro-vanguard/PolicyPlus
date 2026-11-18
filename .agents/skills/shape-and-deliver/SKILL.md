---
name: shape-and-deliver
description: "Delivers one story from its URL; the tags of a work item pick the workflow: a functional story is built, one tagged prototypes is first designed as variants of production code of which one is picked, a bug is fixed at its cause, a technical story changes the code with its behaviour pinned, and one also tagged modernize is built from the legacy rules its attachment cites. Each plan is reviewed and read by its approver as pages; building applies the approved plan on the story's branch, proves it, and leaves the evidence and a result.json for whoever ships it."
---

# Shape And Deliver

Scope: one story in one codebase, on a branch already made for it. `${SKILL_ROOT}` is this skill's folder; profiles are in `${SKILL_ROOT}/profiles/README.md`; what the skill reads of a codebase is in `${SKILL_ROOT}/references/codebase-contract.md`; `start.ts --help` and `next.ts --help` list every argument.

## Run

1. Read the story, and its epic when it has a parent, as the root `AGENTS.md`'s `## Work tracking` says, into a file of `---`, `tags: <its tags>`, `---`, then `# <title>` and the body; for a `modernize` story also read its attachment, as `## Work tracking` says, into a file. Run `bun ${SKILL_ROOT}/scripts/start.ts <story URL> --story <file> [--reference <attachment file>]` from the repository root; it prints the run folder `${RUN}`, or a message to stop on. The same URL resumes the run as it was, any number of times; a changed title, body, attachment or kind starts the plan again, while the code is not yet built.
2. Run `bun ${SKILL_ROOT}/scripts/next.ts ${RUN}` and act on its JSON until it prints `done` or `stop`:
    - `dispatch`: run its one agent in a fresh context, with its `prompt` word for word. Then run `next.ts ${RUN} --after <batch>` with `--run-info <file>` holding the agent's model, tokens, duration and outcome from its report.
    - `wait`: an open batch; its `dispatch` is the agent it handed out. When no agent is running for it, run that one as a `dispatch`; when the batch's agent has finished, run `next.ts ${RUN} --after <batch>`.
    - `stop`: a blocker. Show the approver `forReader` and `open` and wait.
    - `done`: show the approver `forReader` and `open`; when it carries `retag`, apply it to the story and post its comment, as the root `AGENTS.md`'s `## Work tracking` says.
3. After a plan is approved, run `start.ts <story URL> --approve`. After a design is built, start the codebase's dev server so the designer can review it; the designer picks a variant: `bun ${SKILL_ROOT}/scripts/pick-variant.ts <story number> <variant> --to <the screen's route folder>`; feedback on the picked screen is applied by hand and committed now, and the story's `prototypes-ready` tag is removed; then `start.ts` again, which builds, and from there feedback goes only through `--instructions`. After a build, give the operator `${RUN}/evidence.html` and `${RUN}/result.json`.

Every agent reads the story's epic first, then the orientation when there is one, then what is built, then the story. A plan's questions are on its page, each with a recommendation taken on approval, never a stop; only a `blocker` question of the repair stops the run. The operator changes a plan only through `--instructions`, which never add behaviour: once the plan began, each line is `<stage>: <what to change>` and only that stage runs again.

## Stages

- **plan:** `work-item`, `orient-in-kb` (skipped when the codebase declares no knowledge base), `trace-story-paths`, `propose-code-changes`, `write-acceptance-tests` (skipped in a design, which leaves proving the criteria to the build after the pick), then `review-delivery`, which can send work back to the stage that owns it.
- **implement:** the tests of test layers, then the code and its checks, repaired by `fix-failing-checks`; then `review-delivery` and `result.json`.

The run's pages are at the top of `${RUN}`: `index.html`, `plan.html`, `code.html`, `evidence.html`; the rest is in `${RUN}/internal/`.
