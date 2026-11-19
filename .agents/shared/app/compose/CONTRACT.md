# compose and the `case/` contract

`compose` is the only place that joins. It runs before and outside the app's build, reads the producers' outputs, and writes one folder, `case/`, that the app reads alone. The app sorts, filters, windows, lays out and follows a key that `case/` gives it; it never joins, counts or infers.

```
bun compose/cli.ts --payloads <dir> [--target <root>] [--plan <root>] [--source <dir>] --out <case dir>
```

| Argument | What it is |
|---|---|
| `--payloads` | The analysis's payloads folder. It must hold `manifest.json`; compose reads only the files the manifest lists, after checking each one's SHA-1. |
| `--target` | The run's output root that holds `target/` (shape-target). Optional. |
| `--plan` | The run's output root that holds `.modernization-backlog/payloads/{plan,prompts}.json` and `work-items/` (ledger, attachments) and `request.json`. Optional; a plan made from a target needs `--target` too. |
| `--source` | The analysed code, for evidence excerpts. Defaults to the first source root in `<payloads>/../work/analysis-request.json`. When it cannot be read, rules have no excerpt; compose never fails for it. |
| `--out` | The case folder. What was in it is replaced. |

Exit codes: **0** the case is built; **2** an input cannot be read, a required fact is missing, or an input's version is unknown: nothing is written.

What compose reads and never reads: payloads (through their manifest), `target/*.json`, `target/confirmed/*.json` (through shape-target's `changedSince`), `.shape-target/work/records/{journey-variants,architecture-variants,disputes-*}.json` (disputes through shape-target's `loadDisputes`), the plan, prompts, ledger statuses, attachments and `request.json`. Never SQLite, never the conductor's `state.json`, never a clock: the output holds no timestamp, only fingerprints of its inputs.

Determinism: every list is sorted by a stated key, every object's keys are sorted, address parts are given in a fixed order. Two runs on the same inputs, or on the same inputs copied to another folder, give byte-identical folders (tested).

## Versions

| Input | Version read | Refused when |
|---|---|---|
| Payloads | `manifest.json` `contractVersion` 1 | no manifest; another version; a file whose SHA-1 differs from the manifest |
| Target | `target/manifest.json` `contractVersion` 2; a target written before manifests existed is read as written and the case says so | another version; a file whose SHA-256 differs from the manifest |
| Plan | an optional `contractVersion` 1; plans written so far carry none and are read as written | another version |
| Case | `manifest.json` `contractVersion` 1 (`caseContractVersion` in `contract.ts`) | the app refuses any other version |

## Files

Every file is checked against its zod schema in `contract.ts` before it is written; the JSON Schema of each is written beside it under `schema/` (`facts/rules.json` has `schema/facts.rules.schema.json`). `manifest.json` lists every file with its schema, SHA-256 and size in bytes, the input fingerprints and the state of each target decision.

Record ids appear in `facts/`, `journeys/`, `plan/` and `assistant/` as keys, so the app can follow them. Nodes are addressed by keys made of names (`capability/keeping-records`), never by record ids, and `search.json` holds no record id. Paths, ids and commands meant for a reader's assistant are only in `assistant/`.

### Facts: every record once

| File | Holds |
|---|---|
| `facts/system.json` | name, repository, commit, purpose and its first sentence, technologies |
| `facts/kinds.json` | the catalogue of surface kinds (code-analysis `shared/catalogue/surface-kinds.json`): each kind's noun for one and many. Every noun the app shows for a place comes from here |
| `facts/areas.json`, `facts/capabilities.json` | areas with their capabilities; each capability with its actions, rules (distinct), places, data access, open points, and what the analysis declared (for reconciliation) |
| `facts/surfaces.json` | the places: key, name, purpose, kind and noun, product or not, test or not, files, capabilities, actions, tests that reach it, the part it is in |
| `facts/actions.json` | each action (entry point) once: capability (or null), place (or null), part (or null), layer path, rules, code place |
| `facts/rules.json` | each business rule once: what it says, where it is decided and what else it rests on, whether it refuses something, its review reading, the capabilities that hold it (empty for a rule in no capability), the actions that reach it, the tests that reach it |
| `facts/risks.json` | each risk with its capabilities and parts, its breadth (capabilities plus parts named) and its rank (see the Brief) |
| `facts/entities.json`, `facts/layers.json`, `facts/outside.json`, `facts/parts.json`, `facts/terms.json`, `facts/lifecycles.json` | data kinds, layers (with the product flag), outside systems with how they are reached, parts (with the product flag and folders), glossary terms, states and transitions |

### The hierarchy: `nodes/<level>.json`

Levels: `overview`, `area`, `capability`, `surface`, `action`, `rule` (the primary path), `part`, `place` (the structure side path) and `unplaced`. Each node has a `key`, its `name` and one-sentence `summary` (the facts' own first sentence, never rewritten), its `noun`, the record it shows (`ref`), `crumbs`, `up`/`prev`/`next`, at most three `facts` (keys into `numbers.json`), `children` rows, `folds` (closed list of kinds; the app owns their titles) and `lateral` links (`alsoUsedBy`, `livesIn`, `usedBy`, `reachedFrom`, `decidedFor`).

- **A place is shown once per capability that uses it** (`surface/<capability>--<place>`), with that capability's own counts, and `alsoUsedBy` links to the same place under the other capabilities with theirs. Actions and rules have one canonical node, with `reachedFrom` links.
- **Product versus tooling**: a capability's children are its product places; places that build, release or run it fold under `tooling`; tests are never places on the primary path: they fold under `tests` and are counted as `…/tests` ("groups of automated tests that check this capability"). Tests and build steps are full places on the structure side path.
- **Shared rules fold**: a rule reached from at least `max(5, ceil(10% of product places))` product places folds under `sharedRules` on each action instead of being listed.
- **Nothing is dropped**: the `unplaced` node lists rules in no capability, actions in no place, in no capability and in no part, places in no part, and capabilities in no area.

### `numbers.json`: the one numbers table

Every count the app shows is here once: `{ key, value, noun, scope, source, parts? }`. `scope` says in plain words what is counted and within what ("business rules this capability decides, each counted once"); `source` says which facts it is counted from. A combined number carries its count per kind in `parts` ("16 places: 9 of one kind, 7 of another", each with its noun); the parts add up to the value. Nodes, the Brief and the plan refer to numbers by key, so two pages cannot disagree. Registering one key twice with two values fails compose.

### Journeys, architecture and plan (when given)

| File | Holds |
|---|---|
| `journeys/today.json` | today's journeys: the analysis's own when its payloads carry them, otherwise the target's copy; title and capability derived when absent |
| `journeys/proposed.json` | the chosen way of each journey: steps with their change word (stored value; the app shows its plain label), the rules each step honours, keeps and changes, the journey's drops, and the alternatives not chosen |
| `journeys/trace.json` | per chosen step: the stories that name the step (never a story that only builds one of its rules), the distinct components that serve it, their domains, its primary domain (most components, ties by domain order), rules kept (honoured, not changed and not dropped), changed and dropped, and the other journeys the same components serve |
| `journeys/dropped.json` | what each chosen journey leaves out by design, with the reason |
| `journeys/changed.json` | each target decision: `confirmed`, `changed` (the file differs from the hash the decision kept), `confirmed, no hash kept`, or `not made`; and what was added, removed and changed since confirmation (shape-target's `changedSince`; null when no confirmed copy is kept) |
| `architecture.json` | the chosen architecture: domains with their rules and distinct component count, containers with `does`, `runsOn` and its words from shape-target's catalogue, components, integrations, risks (plain or structured), how containers talk (component uses between the containers that run their domains) and the uses that cross domains, and the alternatives with their scores |
| `plan/stories.json` | each story: kind of work from its tags (shape-and-deliver's `workflowOf`; null when the tags name none), blockers and the stories it unblocks, rules built and relied on, steps, components, domains (from components, else from the domains of the rules it builds), layers it is built in, status from the ledger |
| `plan/epics.json`, `plan/phases.json`, `plan/layers.json`, `plan/decisions.json` | epics with a label (the chosen journey's name for a journey epic); phases as the plan names them with the layers they are built in; layers with the request's stack lines they carry and their stories |
| `plan/ready.json` | the stories ready to start under the conductor's rule: not merged, every blocker merged, every story of every epic the story's epic comes after merged |
| `plan/matrix.json` | the journey by domain matrix: each cell's steps and stories, row and column totals; the column `""` holds steps no component serves |
| `plan/conflicts.json` | the challenges that survived review: the plan's own `conflicts` when it carries them, otherwise the target's disputes (`resolved` null) |

### `brief.json`

The system's name and purpose; the person's Goals verbatim from `request.json`, or `provided: false` (the app says "Not provided"); what changes: each stack line of the request with the layers that carry it, the containers in plain words, and how they talk; the risks ranked by a stated rule (severity, then how many capabilities and parts a risk names, then its words) with the top five; the plan's structure as number keys and the phases' names.

### `diagrams.json`

One record per diagram whose facts exist: `organisation` (layers, or the target's domains), `context` (the system and what it reaches, or the target's containers), `navigation` (the analysis's leads-to links between places), `data` (capabilities and the data they read or save; one per lifecycle for states), `flow` (per capability, the layers its work passes through), `compare` (per chosen journey, today's steps against the new ones). Each has nodes, edges with a kind and a count, a `legend` of the edge kinds in plain words, a `text` version with one line per edge, `shown` (at least two nodes and one edge), and a `caption` and `question` taken from the analysis's Figure choice for that kind when one exists, null otherwise.

### `evidence.json`, `search.json`, `assistant/`

- `evidence.json`: per rule id, at most 15 lines of the analysed code from the place the rule cites, with the file relative to the code's root; absent when the code cannot be read.
- `search.json`: one record per node: name, the word for its level, the parent's name, a short text; no record id.
- `assistant/<kind>.json` (`system`, `capability`, `surface`, `action`, `rule`, `story`, `journey`): the texts a reader copies for an assistant, by scope key; `assistant/index.json` gives each text's exact size in bytes. A capability's and a place's text is the analysis's own bundle, built by code-analysis's `capabilityBundle`/`surfaceBundle` and `bundleText` (without source). A rule's text holds that rule only. A story's text holds the story, how to deliver it and its legacy attachment. Every absolute path under the folder the run sits in (the parent of the `--plan` or `--target` root) or under the analysed code's root is made relative to it, so commands read from the repository and no home folder is copied.

## Corrections over the mockup's generators

Rules kept exclude rules a step changes and rules its journey drops; components are counted distinct; a step's stories exclude stories linked only through a rule they build; the capability of an area comes from the system's areas (never a fixed table); a journey's title and capability come from the facts, and from its id and actions only when absent.

## Budgets (measured on this machine)

| System | Places | Actions | Rules | Time | Case size | Peak memory |
|---|---:|---:|---:|---:|---:|---:|
| Policy Plus (analysis only) | 29 | 163 | 450 | 0.2 s | 5.1 MB | 0.18 GB |
| Policy Plus with target and plan | 29 | 163 | 450 | 0.5 s | 14.4 MB | 0.38 GB |
| Balkan Air | 150 | 829 | 909 | 0.5 s | 11.1 MB | 0.34 GB |
| Roller | 339 | 1,167 | 3,551 | 1.9 s | 63.9 MB | 1.1 GB |

The neutrality test fails when any real system takes 30 s or more. Most of a large case is `assistant/` (Roller: 37 MB, rules and actions); the app should load it per kind, on demand.

## Tests

`tests/compose/`: unit tests per module (`units.test.ts`), two runs and a moved copy identical and the exit codes (`determinism.test.ts`), and neutrality (`neutrality.test.ts`): a scan of compose's code for stack, medium and product words, and, when `COMPOSE_REAL_PAYLOADS` names a folder of `<system>/payloads` and `COMPOSE_REAL_RUN` a run's output root, real systems composed into cases of the same files and shape.
