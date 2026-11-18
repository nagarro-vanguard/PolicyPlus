---
name: create-work-item
description: Creates a work item (an epic, a user story, a technical story or a bug) from a person's intent, its body filled from a template and checked before it is created, with its tags, its parent and its blockers.
---

# Create Work Item

Goal: one work item that a person or a program reads without help, says what was asked and nothing more, and reads at a glance. A criterion nobody asked for becomes work nobody wanted.

## Arguments

- `intent` (required unless `body` is given): what the person wants, in their own words: a sentence, a pasted brief or a local plan's text.
- `body` (optional): a file already in final template shape, `# <title>` first, then the body from `##`. The body is not derived from the intent and is not written again; it is still checked.
- `template` (optional): the file to fill; left out, the one for the item's kind: functional epic, technical epic (an epic tagged `technical`), user story, technical story or bug. It is found by `bun ${SKILL_ROOT}/scripts/resolve-template.ts <repository> <file> [--templates <folder>]`: the repository's `templates/`, then `templates`, then `.agents/shared/templates/`.
- `templates` (optional): a folder of templates, searched after the repository's own `templates/` and before the shared ones.
- `tags` (optional): the item's tags, as the root `AGENTS.md`'s `## Work tracking` names them.
- `parent` and `blockers` (optional): the epic it belongs to and the items that block it.
- `dryRun` (optional): write and check the body, and create nothing.

## Work

1. Without `body`, read the template (found as `template` says); its opening comment says what to keep and what to ask. Write `work-item.md` in a temp folder: `# <title>` first, a plain imperative of 72 characters or fewer with no type prefix, then the body from `##`: every comment removed, no section left empty, no emoji, no line crediting the tool that wrote it, and no local plan or path a clone doesn't have.
2. Derive the title, the story, the criteria from the intent's outcomes and what is out of scope; ask once, all together, only what cannot be derived with confidence.
3. With `body`, steps 1 and 2 are skipped and `work-item.md` is that file. Run `bun ${SKILL_ROOT}/scripts/check-work-item.ts work-item.md` until it prints `ok`, then `markdownlint-cli2 --no-globs work-item.md` from the repository root.
4. Unless `dryRun`, create the item as the root `AGENTS.md`'s `## Work tracking` says, with its tags, parent and blockers.

## Output

The body's path and, unless `dryRun`, the created item's address as the last line.
