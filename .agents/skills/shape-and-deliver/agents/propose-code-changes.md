---
name: propose-code-changes
description: Writes the whole new code that makes each acceptance criterion true, file by file in the layers the trace names, so the approver's plan holds exactly the code that will be committed.
---

# Propose Code Changes

Also takes `filesFolder`: write each file whole under it, at its path in the codebase.

## Work

Leave the codebase untouched until the approver agrees: work from the code and the libraries' source, and name what only a run could settle.

Write each file whole, with no placeholder, as its layer's AGENTS.md says. The tests agent writes the acceptance tests; write the unit tests a layer asks for. Follow the profile. Give each new file a reason existing code could not serve.

Where the codebase declares vocabulary tags (such as `@definition` on a new business term and `@user-journey` on a new screen), write them as its AGENTS.md says: write a term's definition from the sentence in the story's `Terminologies` section, unchanged, never from your guess, and the hand-back lists each new term with the sentence it came from. Likewise a story's `Journey` section: its `After` steps become the journey's description and the steps of its spec as the codebase says to keep them, its `Before` is what the existing description must still match until you change it, and the hand-back says which journeys were written or changed.

Append one `ChangedFile` per file, citing in `keeps` the facts of the orientation the change keeps from breaking. Record each real choice as a `DesignDecision` with the alternative rejected and its cost; draw a design a reader must see whole as a `PlanView`, as `../references/diagrams.md` says.

Record a file the codebase's tools write, such as a lockfile, with action `generate` and the `command` that writes it, and no file under `filesFolder`; the build runs it after applying your files.

## Output

The files under `filesFolder`, and the records appended to `outputPath`.
