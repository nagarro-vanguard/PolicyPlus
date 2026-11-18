# The codebase contract: what the skill reads of a codebase

The skills know nothing of a codebase's stack. They read it from its `AGENTS.md` files, and everything else in those files is prose for agents, in the project's own order. This file is the only description of what is read; `bun .agents/skills/shape-and-deliver/scripts/check-codebase.ts <root>` checks a codebase against what `shape-and-deliver` reads and says `ok` or what blocks it, and whether design is available.

Prerequisites the skills keep: git, Bun to run their own scripts (shape-and-deliver's need Bun on the machine that runs them, whatever the codebase's stack: the codebase itself needs no Node), a tracker with parent and child items, commits written as conventional commits with a `Refs: <id>` footer, `.artifacts/` git-ignored, and `templates/`, with its `pr-template.md`, at the root.

| Where     | Section              | Needed by                                      | Holds                                                                                                                                                                                                                                                                        |
| --------- | -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| root      | `## Layers`          | every run                                      | one table, columns `Layer`, `Path`, `Kind` (`code`, or `test` for a layer whose tests drive the running product and are committed first), `Depends on` (layer names, `-` for none; a bracketed note narrows how)                                                             |
| root      | `## Knowledge base`  | `shape-and-deliver` orients in it when present | one folder holding a `README.md`: the domain model, tier by tier                                                                                                                                                                                                             |
| root      | `## Work tracking`   | `shape-and-deliver` reading a story            | the tags (`epic`, `story`, `functional`, `technical`, `bug`, `prototypes`, `prototypes-ready`, `modernize`) as the tracker's labels, and how an agent reads an item and its parent, creates one with tags, links a sub-issue and a blocker, retags and comments, and opens a pull request |
| root      | a `## Rules` bullet  | optional                                       | the vocabulary tags the codebase keeps in its code, such as `@definition` on an exported business term and `@user-journey` on a screen, and the document that explains them                                                                                                  |
| layer     | `## Verify`          | every layer                                    | the commands that check the layer, each as `` - `command` ``, run from the layer's folder                                                                                                                                                                                    |
| one layer | `## Design variants` | `design` runs                                  | items `Variants:` (a folder, with `{story}`), `Picked to:` (globs) and `After a pick:` (commands); every path is from the codebase root and every command runs from it                                                                       |

Three things are optional, and the skills say so when they skip them. A knowledge base is optional: without `## Knowledge base`, `shape-and-deliver` skips the orientation stage, asks for no entity records, and gives no orientation to the later agents. Design assumes screens: it is for a feature whose screens a layer declares in `## Design variants`, as variants of production code in that layer, and a codebase with no such layer has no design runs, only builds.

Vocabulary tags are optional: where a root rule declares them (for example `@definition`, one sentence on a business term in the product owner's words, and `@user-journey`, the journey a screen belongs to, whose description follows the tag and `journey-footprint.ts` prints it), the skills resolve a business word through its definition and never infer one, write each new term's definition from the sentence in the story's `Terminologies` section, and name the journey a story states; a word that neither the story nor the code defines is a question for the person.

A layer's `AGENTS.md` sits in its path. Layers may nest: a path inside another's is a layer of its own, and a file belongs to the layer with the longest path that holds it. A change is checked in the layers that hold its files and in every layer that depends on them, through any chain, after the root layer's own checks.

## Test results the skill reads

No section declares a layer's results. The skill runs each layer's `## Verify` from its folder with `EVIDENCE_DIR` (a folder emptied for the layer and the run) and `WORK_ITEM_ID` set, then reads what the run left in `$EVIDENCE_DIR`:

- `proof.json`, when it is there: `{ tests: [{ title, acs, passed, message?, video? }], thresholds: [{ ac, metric, limit, observed, held }] }`. `acs` may be left empty: the skill then credits the test by its title, as it does for JUnit, and a test that lists `acs` keeps them; a `video` is a path relative to the file.
- Otherwise JUnit XML: every `*.xml` file directly in `$EVIDENCE_DIR`, as bun test, Vitest and Playwright write it. The plan's `AcceptanceTest` records say which test proves which criterion: a test proves criterion `ac` when its classname and name together contain the `title` of an `AcceptanceTest` record for `ac` (a describe prefix before the planned title is fine; case and spacing are ignored). A failure, an error or a skip is not a pass. Every other test is an existing test: it must not fail, and proves nothing new. Give each test a descriptive title that states the criterion's behaviour, and record the same title in its `AcceptanceTest`; a title never holds a planning identifier (a criterion number or a work item id).
- Otherwise nothing: the layer's commands still run and are judged by exit status, and the layer proves no criterion; the evidence page says so.
- A `proof.json` or XML file that is not in this shape stops the run.
- A command that exits 69 (`EX_UNAVAILABLE`) says its environment is unavailable: the run stops and spends no repair round.

A layer's black-box tests may sit in a folder of the layer itself, such as `__tests__`: they are part of the layer, run by its `## Verify` and committed with its code. A layer that wants them committed first, and run on the code as it was forked, declares that folder as a nested layer of kind `test`.

A criterion no test runner reaches (infrastructure, a command-line tool) is proved by a command check: the plan's `AcceptanceTest` record names a `command` and its `layer` in place of a test `file`. After the code commit the skill runs the command from the layer's folder with `EVIDENCE_DIR` and `WORK_ITEM_ID` set; exit 0 passes the criterion and any other exit fails it. The command is the test's title and the end of its output is kept as evidence.

A file the codebase's tools write, such as a lockfile, is found by the proposing agent in the prose and recorded in the plan with the command that writes it.

A worked example, small enough to copy:

```markdown
# Shop

## Layers

| Layer     | Path | Kind | Depends on |
| --------- | ---- | ---- | ---------- |
| workspace | .    | code | -          |
| api       | api  | code | -          |
| e2e       | e2e  | test | api        |

## Knowledge base

docs/kb

## Work tracking

- Tags `epic`, `story`, `functional`, `technical`, `bug` are labels of the same name.
- Read an item with `trk show <n>` and its parent with `trk show <n> --parent`; create, retag, comment and open a pull request with `trk`'s own commands.

## Verify

- `npm ci`
```

and, in `api/AGENTS.md`, `## Verify` with `` - `npm test` ``; in `e2e/AGENTS.md`, `## Verify` with `` - `npm test` ``. Nothing else is required.

To set a new codebase up: write the root sections, give every layer an `AGENTS.md` with `## Verify`, have each layer's Verify write its test results as below, then run `check-codebase` until it prints `ok` for the runs you use. What the skills ask of an agent that is not in this table (a convention, a stack fact) belongs in the root or layer prose, once, and is linked from everywhere else.
