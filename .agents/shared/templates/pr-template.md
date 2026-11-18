<!-- markdownlint-disable-file MD033 MD041 -->
<!-- A pull request body: GitHub shows the title above it, so it starts at ##, and <…> marks text to replace. -->
<!-- Title: the conventional commit subject alone, e.g. feat(api): stream run events. It becomes the squash commit,
     so commitlint checks it. Fill every section from the work item, the commit log and, when given, shape-and-deliver's
     afterCode manifest. Delete a section the change doesn't need; never leave one empty. No emoji, and no line
     crediting the tool that wrote it. -->

## Summary

<!-- Two or three bullets: what changes for a person or a system, and why now. -->

Closes #<work item number>

## Changes by layer

<!-- One row per layer touched, in the root AGENTS.md's Layers order, in the product's words. -->

| Layer | What changed and why |
| --- | --- |

## Proof, per acceptance criterion

<!-- One subsection per criterion: each test whose `acs` include it and whether it passed; each load threshold with
     its limit, what was observed and whether it held; its video attached, alone on its own line. Without a manifest,
     say how each criterion was checked. -->

### AC-1: <criterion>

- <layer>: <test title>: passed
- load: <metric> within <limit>: observed <value>, held

## Design decisions

<!-- Each choice that shapes the change, the alternative rejected and what it costs, from shape-and-deliver's code changes
     records. Delete the section when the plan recorded none. -->

## Facts kept

<!-- Each journey or rule of the product the change could break, in the product's words, and the test that proved it still
     holds. Delete the section when none is at risk. -->

## Contract

<!-- A designed story only. Each new operation of @continuum/http-api, its request and response, and the errors it can
     return; a developer approves this section. -->

## Shared changes

<!-- A designed story only. Each existing ui or web file this change edits, so a reviewer sees what other screens it can
     touch. "None" when it adds only new files. -->

## Deploy and rollback

<!-- Migrations (expand-only, or a contract step later?), new configuration or secrets, ordering between the
     migration job and api, and how to roll back. "None" when nothing changes at deploy. -->

## Risk and impact

<!-- Breaking changes to @continuum/http-api, security or data-scope impact, performance, and what to watch after
     release. -->

## Deviations and open questions

<!-- Every departure from what the work item asked for and why, every question left open. "None" when none. -->

## Root cause and fix

<!-- Bugs only: what caused it, and how this change removes the cause. -->
