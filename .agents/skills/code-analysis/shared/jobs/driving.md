# Driving a stage

`S` = `CODE_ANALYSIS_ROOT=${ANALYSIS_ROOT} bun ${SKILL_ROOT}/cli`. SKILL.md lists the stages in the order they run; each has its section here, under its name. Every stage runs `prepare → finish`, driven by `next`. A stage run clears every later stage's standing, so after running any stage again, run the later ones and Publish again.

## Driving a stage

Every stage is driven the same way, by its script's `next`; the scripts make every sequencing decision (the order of jobs, the gate after each agent, a fix with the gate's gaps, the reviews, `finish`), so a driver only dispatches agents, reports them, and tells the person what was found.

**Job state.** Every job's state is its latest decision in `${ANALYSIS_ROOT}/analysis.sqlite`: to run, to review, to fix, decided or refused, with its round, the fixes it has taken, its feedback and its batch. Nothing is inferred from which files exist, so a killed session or a rate limit loses nothing: run `next` again and no job runs twice and none is lost. The scripts cannot see an agent start or end, so the harness reports it:

- `S/<stage script> done <job> [--seconds <n>]`: the agent of a job of the open batch has finished; the job is named as the dispatch gave it.
- `S/<stage script> abandon <job>`: the agent crashed; the job leaves the open batch, keeps its state, and is handed out again by the next `next`. Its output, written or not, is never gated.

**Every job is reviewed.** A job runs gate → review → one fix for each: its output passes the stage's gate (structure, coordinates and ids; never wording), then a reviewer reads it against the code, and a job sent back is run again once with the gate's gaps or the review's challenges as its `customInstructions`. Once a fix is taken, a second review judges only the records it changed and the records dropped since, the last agent pass: a challenge there stays, labelled `disputed`, for the person. The reviewer writes its challenges, what it found missing, and one receipt: the line ranges of the job's files it read, which must cover every non-blank line of the job (the Map's windows; a Capability rules job's blocks, or a life's saves; for other jobs, the lines its records cite). A review that fails its own check is run again once; failing twice makes the job refused. A refused job's lines show as not mapped. Each record is stored with where its job's review left it, `reviewed` (the review let it stand), `corrected` (a challenge was fixed) or `disputed` (a challenge still stands, with the reviewer's words), derived from the files, and the pages show it in those words. The person is never asked about the code: nothing in the run waits for them.

1. `S/<stage script> next --limit <n>`, the limit sized to the rate limits the harness reports; `next` has no default, and four agents at a time is a sound start, since a run of ten or eleven large agents at once is what meets them. It prints one action as JSON, with the `assumptions` the agents of the batch it just closed wrote: tell the person each one as it arrives (what the agent went with, why no file settles it, what changes if it is wrong), and go on.
2. `dispatch`: run every agent of the batch in parallel, each as a subagent sent its `prompt` word for word, and each keeping its working files in a folder of its own that no other agent writes in. As each returns, report it with `done <job>`; if one crashes, `abandon <job>`. A job sent back for its fix may be continued in the agent that wrote it, sent the new `customInstructions` instead of a fresh agent, which saves it reading the code again; a review always runs in a fresh agent. Then `S/<stage script> next --limit <n> --after <batch>`, which closes only the jobs reported done and leaves the rest in the batch, and act on what it prints.
3. `wait`: a batch is still open. Wait for its agents, then close it with `--after`; after a compaction, `S/<stage script> status` names the open batch and where every job stands.
4. `done`: the stage's loop is complete. Tell the person what `S/<stage script> show` says (where it stands and its jobs; `--json` gives its standing as data), and go on to the next stage. Nothing waits for the person: assumptions are disclosed, never held for an answer.
5. `stop`: a step refused; stop with its message.

One driver at a time. Long steps print their progress on standard error, one line each whole percent (`<step>: <done> of <of> <what>`); let those lines reach the person as they arrive. Should the person, unasked, correct an assumption, it goes in through `S/<stage script> challenge <fact id> "<their words>"`, or `attach <fact id> <path>` for material that settles it, the id as the assumptions register shows it; on the whole register, through `accept-assumptions`; their words on any job's output, through the stage's `prepare <job>` with `--custom-instructions "<their words>"`. Either way `next` then runs the jobs it rests on again; each waits while a batch is open. To run a stage again from nothing, `S/<stage script> prepare --fresh`: it deletes the stage's job state, batches, documents and work folder in one step (refused while a batch is open), so no earlier artifact, feedback or round survives into the new run. To run an earlier stage again, run each later stage's `prepare` first, latest first.

## Reading a run with no agent

After each stage, read `S/<stage script> status` (where every job stands; exit 0 only when the loop is complete) and `show` (its standing). Stop to look when one is off:

- **After the Map:** jobs refused; links with no target, by kind: only calls into code with no source here (libraries) or chosen at run time; saves from schema, patch or migration files: none (a definition is not a save).
- **After Capabilities and entities:** entities and capabilities: a business of this size has tens, not hundreds.
- **After Capability rules:** rules gating a change of state; a rule that names a stored code (`status 3`) where the life names the state is a gap.
- **After Publish:** review labels only on questioned statements.

## Done when

Publish's `next` prints `done` and the person has been told what `show` reports.
