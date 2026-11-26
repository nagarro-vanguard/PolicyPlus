# compose and the `case/` contract

`compose` is the only place that joins. It runs before and outside the app's build, reads the producers' outputs, and writes one folder, `case/`, that the app reads alone. The app sorts, filters, windows, lays out and follows a key that `case/` gives it; it never joins, counts or infers.

```
bun compose/cli.ts --payloads <dir> [--target <root>] [--plan <root>] [--source <dir>] --out <case dir>
```

| Argument | What it is |
|---|---|
| `--payloads` | The analysis's payloads folder. It must hold `manifest.json`; compose reads only the files the manifest lists, after checking each one's SHA-1. |
| `--target` | The run's output root that holds `target/` (shape-target). Optional. |
| `--plan` | The run's output root that holds `.modernization-backlog/payloads/plan.json` and `work-items/` (attachments) and `request.json`. Optional; a plan made from a target needs `--target` too. |
| `--source` | The analysed code, for evidence excerpts. Defaults to the first source root in `<payloads>/../work/analysis-request.json`. When it cannot be read, rules have no excerpt; compose never fails for it. |
| `--out` | The case folder. What was in it is replaced. |

Exit codes: **0** the case is built; **2** an input cannot be read, a required fact is missing, or an input's version is unknown: nothing is written.

What compose reads and never reads: payloads (through their manifest), `target/*.json`, `target/confirmed/*.json` (through shape-target's `changedSince`, and for the names of what changed), `.shape-target/work/records/{journey-variants,architecture-variants,disputes-*}.json` (disputes through shape-target's `loadDisputes`), the plan, attachments and `request.json`, and, to say whether the plan is out of date, what the plan skill's `changedSinceBuilt` compares its `builtFrom` with (the analysis under the plan root and the target's decisions). Never SQLite, never the conductor's `state.json`, never a clock: the output holds no timestamp, only fingerprints of its inputs.

Determinism: every list is sorted by a stated key, every object's keys are sorted, address parts are given in a fixed order. Two runs on the same inputs, or on the same inputs copied to another folder, give byte-identical folders (tested).

## Versions

| Input | Version read | Refused when |
|---|---|---|
| Payloads | `manifest.json` `contractVersion` 1 | no manifest; another version; a file whose SHA-1 differs from the manifest |
| Target | `target/manifest.json` `contractVersion` 2 (its optional `goalsSha` holds the stamp of the goals the journeys and the architecture were finished with); a target written before manifests existed is read as written and the case says so | another version; a file whose SHA-256 differs from the manifest |
| Plan | an optional `contractVersion` 1; plans written so far carry none and are read as written; an optional top-level `goalsSha` | another version |
| Case | `manifest.json` `contractVersion` 4 (`caseContractVersion` in `contract.ts`) | the app refuses any other version |

## Files

Every file is checked against its zod schema in `contract.ts` before it is written; the JSON Schema of each is written beside it under `schema/` (`facts/rules.json` has `schema/facts.rules.schema.json`). `manifest.json` lists every file with its schema, SHA-256 and size in bytes, the input fingerprints and the state of each target decision.

Record ids appear in `facts/`, `journeys/`, `plan/` and `context/` as keys, so the app can follow them. They never appear inside a sentence a reader meets: compose replaces a record id in agent text (a rule's `why`, `plan/conflicts.json` `says`, a story's `open` questions and criteria, the architecture's risks) with the record's own words in quotes (a rule's first sentence, an action's summary, the name of a kind of data, capability, part, area or outside system, a risk's summary), and takes out an id it holds no record for (a state change, a finding) with the brackets or list around it (`build/plain.ts`). Nodes are addressed by keys made of names (`capability/keeping-records`), never by record ids, and `search.json` holds no record id. Paths, ids and commands meant for the context a reader copies are only in `context/`.

### Facts: every record once

| File | Holds |
|---|---|
| `facts/system.json` | name, repository, commit, purpose and its first sentence, technologies |
| `facts/kinds.json` | the catalogue of surface kinds (code-analysis `shared/catalogue/surface-kinds.json`): each kind's noun for one and many. Every noun the app shows for a place comes from here |
| `facts/areas.json`, `facts/capabilities.json` | areas with their capabilities; each capability with its actions, rules (distinct), places, data access, open points, and what the analysis declared (for reconciliation) |
| `facts/surfaces.json` | the places: key, name, purpose, kind and noun, product or not, test or not, files, capabilities, actions, tests that reach it, the part it is in |
| `facts/actions.json` | each action (entry point) once: capability (or null), place (or null), part (or null), layer path, rules, code place |
| `facts/rules.json` | each business rule once: what it says, where it is decided and what else it rests on, whether it refuses something, its review reading, the capabilities that hold it (empty for a rule in no capability), the actions that reach it, the tests that reach it |
| `facts/risks.json` | each risk with its capabilities and parts, the product places (`surfaces`, by key) whose files hold a file the risk's findings lie in, its breadth (capabilities plus parts named) and its rank (see the Brief). The analysis names no places for a risk; `surfaces` is that join of files, empty when none matches |
| `facts/entities.json`, `facts/layers.json`, `facts/outside.json`, `facts/parts.json`, `facts/terms.json`, `facts/lifecycles.json` | data kinds, layers (with the product flag), outside systems with how they are reached, parts (with the product flag and folders), glossary terms, states and transitions |

### The hierarchy: `nodes/<level>.json`

Levels: `overview`, `area`, `capability`, `surface`, `action`, `rule` (the primary path), `part`, `place` (the structure side path), `unplaced` and `goal`. Each node has a `key`, its `name` and one-sentence `summary` (the facts' own first sentence, never rewritten), its `noun`, the record it shows (`ref`), `crumbs`, `up`/`prev`/`next`, at most three `facts` (keys into `numbers.json`), `children` rows, `folds` (closed list of kinds; the app owns their titles) and `lateral` links (`alsoUsedBy`, `livesIn`, `usedBy`, `reachedFrom`, `decidedFor`).

- **A place is shown once per capability that uses it** (`surface/<capability>--<place>`), with that capability's own counts, and `alsoUsedBy` links to the same place under the other capabilities with theirs. Actions and rules have one canonical node, with `reachedFrom` links.
- **Product versus tooling**: a capability's children are its product places; places that build, release or run it fold under `tooling`; tests are never places on the primary path: they fold under `tests` and are counted as `…/tests` ("groups of automated tests that check this capability"). Tests and build steps are full places on the structure side path.
- **Shared rules fold**: a rule reached from at least `max(5, ceil(10% of product places))` product places folds under `sharedRules` on each action instead of being listed.
- **Goals are nodes** (`goal/<n>`, `n` from 1 in the order the person wrote them): their `name` is a short label (the goal's first clause, at most eight words, never ending mid-phrase), their `summary` is the goal as written, and they have no children or folds; they sit directly under the overview. Compose adds them after the analysis's nodes, and puts the goals no stage considered, or a stage considered before they changed, ahead of the risks in the overview's `checkFirst` fold. `search.json` holds them like any node.
- **Nothing is dropped**: the `unplaced` node lists rules in no capability, actions in no place, in no capability and in no part, places in no part, and capabilities in no area.

### `numbers.json`: the one numbers table

Every count the app shows is here once: `{ key, value, noun, scope, source, parts? }`. Besides the hierarchy's and the Brief's: `journey/<slug>/steps/today`; with a target `journey/<slug>/steps/proposed`, `journey/<slug>/rules/{kept,changed,dropped}`, `journey/<slug>/step/<n>/rules/{kept,changed,dropped}`, `journeys/dropped/actions`, `journeys/strategies` (parts per strategy), `architecture/score/{steps,steps-served,rules,rules-assigned}` (when the chosen option keeps a score), `architecture/domain/<slug>/{components,rules}`, `architecture/landing/<layer>` and `architecture/landing/<layer>/<domain or none>`, `architecture/unplaced`; with a plan `plan/unplanned`. `scope` says in plain words what is counted and within what ("business rules this capability decides, each counted once"); `source` says which facts it is counted from. A combined number carries its count per kind in `parts` ("16 places: 9 of one kind, 7 of another", each with its noun); the parts add up to the value. Nodes, the Brief and the plan refer to numbers by key, so two pages cannot disagree. Registering one key twice with two values fails compose.

### Journeys, architecture and plan (when given)

| File | Holds |
|---|---|
| `journeys/today.json` | today's journeys: the analysis's own when its payloads carry them, otherwise the target's copy; title and capability derived when absent |
| `journeys/proposed.json` | the chosen way of each journey: steps with their change word (stored value; the app shows its plain label), the rules each step honours, keeps and changes, the journey's drops, `hasChanges` (a step whose change word is not `kept`, a new step, or a drop), and the alternatives not chosen |
| `journeys/trace.json` | per chosen step: the stories that name the step (never a story that only builds one of its rules), the distinct components that serve it, their domains, its primary domain (most components, ties by domain order), rules kept (honoured, not changed and not dropped), changed and dropped, and the other journeys the same components serve |
| `journeys/dropped.json` | what each chosen journey leaves out by design, with the reason |
| `journeys/changed.json` | each target decision: `confirmed`, `changed` (the file differs from the hash the decision kept), `confirmed, no hash kept`, or `not made`; and what was added, removed and changed since confirmation (shape-target's `changedSince`; null when no confirmed copy is kept), with `names`: the title or name of each key, from the confirmed copy for a removed item and the file now for the rest (a key with no name is not in `names`) |
| `architecture.json` | the chosen architecture: domains with their rules, dependencies and distinct component count, containers (name, kind, technology, what they hold), components, integrations, risks as plain sentences, the other options (idea, trade-off, risks, score), the score, where today's rules land and the rules no domain holds. |
| `plan/stories.json` | each story: its kind (functional or technical), blockers and the stories it unblocks, rules built and relied on, steps, components, domains (from components, else from the domains of the rules it builds), layers it is built in, `criteria` (`says`, and `given`/`when`/`then` when the sentence is in that form, else null; `from` as `{kind, id}` with `kind` rule, transition, decision, layer or step), `open` (the plan's questions for the story), `challenges` (the plan's unresolved conflicts whose `variant` is the story's key) |
| `plan/epics.json`, `plan/phases.json`, `plan/layers.json`, `plan/decisions.json` | epics with a label (the chosen journey's name for a journey epic); phases as the plan names them with their epics (keys, in story order) and the names of the layers they are built in (empty when the plan's stories name none); layers with the request's stack lines they carry and their stories |
| `plan/unplanned.json` | the plan's `coverage.unplanned`: code nothing the analysis followed reaches, each with its name in the code, file and lines (empty for a plan that keeps none) |
| `plan/stale.json` | `true` when the plan skill's `changedSinceBuilt` says the analysis or a decision changed since the plan was built, `false` when it did not, `null` when the plan keeps no `builtFrom` or it cannot be compared |
| `plan/matrix.json` | the journey by domain matrix: each cell's steps and stories, row and column totals; the column `""` holds steps no component serves |
| `plan/conflicts.json` | the challenges that survived review: the plan's own `conflicts` when it carries them, otherwise the target's disputes (`resolved` null) |

### `goals/goals.json`

Written only when the request holds goals. The conductor's closing report and the app's Goals section read it. For each goal, whether every stage of the work considered it: the journeys, the target architecture, the foundation decisions and the plan's stories. It says nothing about whether a goal is built, tested or met: the work stops at the plan.

```
{ goalsSha, goals: [ { number, key: "goal/<n>", text, label, summary, firstGap,
    marks: { journeys, architecture, foundation, stories },   // each { state, targets: [key] }
    answer: { how, where: [{ name, node }] } | null,          // the chosen architecture's answer
    decision: { node, chose, layer, reason } | null,           // the foundation decision whose topic is this goal
    stories, epics, components, journeys: [key] } ] }
```

- `goalsSha` is the sha256 of the JSON of the request's goal strings, in order. The journeys, the architecture and the plan carry the stamp they were finished with (written by their own tools, never by an agent); a stage whose stamp differs from the request's, or that kept none, is `stale` for every goal.
- A mark's `state`: `considered` (the stage's output holds what considers the goal); `settled` (journeys and architecture only: the answer names no place, the goal is settled in the foundation, and that counts as considered); `notReached` (journeys only: the answer names places that serve no step of a chosen journey); `missing` (the stage is not written, or its output does not hold the goal; the journeys also need a confirmed architecture); `stale`.
- Journeys: the steps served by the components of the domains the answer names, and of the domains held by the containers it names. Foundation: the plan decision whose topic is `goal n`. Stories: a story whose criterion's `from` is `goal n` or the goal's decision.
- `summary` is `considered` when no mark is `missing` or `stale`, otherwise the state of the first such mark (stage order journeys, architecture, foundation, stories), which is `firstGap`. `notReached` does not make a summary: it is shown, not a gap. Compose never fails for a stale or missing mark.
- Every target is a node key of another section: `story/<place in the plan's order>`, `epic/<the epic's key>`, `decision/<the decision's id>`, `journey/<slug>`, `domain/<slug>`, `container/<slug>`, `component/<slug>`. Only `goal/<n>` is a node of the hierarchy.

### `brief.json`

The system's name and purpose; the person's Goals verbatim from `request.json` as a numbered list (`goals.text`, and `goals.items`: each goal's number, node, label, words and summary mark), or `provided: false` (the app says "Not provided"); what changes: each stack line of the request with the layers that carry it, the containers in plain words, and how they talk; the risks ranked by a stated rule (severity, then how many capabilities and parts a risk names, then its words) with the top five; the plan's structure as number keys and the phases' names.

### `views.json`

An ordered list of the pictures of the case, as the model wrote them: `{ key, section, viewpoint, title, caption, boxes, arrows, text }`. `section` is where it sits (`today`, `target` or `variant.<name>`) and `viewpoint` one of functional, technical, deployment. `title` is the question the view answers. A box is `{ id, label, note, group, cites }`: a box another names as its `group` is drawn as a frame around its members, and each cite is `{ id, text, node }`, the record's name and, when the record is a place of the hierarchy, that place. An arrow is `{ from, to, label }`. `text` is the text version, one line per arrow and one per box no arrow touches, made by script from the boxes and arrows. Compose derives nothing else: no box, arrow, label or word of a view is written by a script.

#### Principles of a view

1. A view answers one question a reader asks; its title is that question. A catalogue is a table, not a view.
2. The model decides the boxes, the frames, the labels and the arrows; the guard (`code-analysis/shared/views/guard.ts`) refuses only what is not well formed, and nothing in a script names a technology, a medium or a place something runs.
3. A box may cite the records it rests on; a cite shows the record's name and, when it has a page, links to it.
4. No count in a title or a caption; an arrow is never labelled with only a number.
5. A view holds at most 24 boxes and 48 arrows; an arrow count above twice the boxes is shown as a table.
6. Every view has a text version, made by script from its boxes and arrows.
7. A target variant draws every domain as a box of a functional view and every container as a box of a deployment view.
8. The same input gives the same case.
9. Every text is short enough to be placed: a box name at most 6 words, a note 40, an arrow label 4 (`viewLimits` beside the guard). The guard refuses a longer one when it is written; compose refuses it again when it builds, and refuses a text version that leaves out a box or an arrow, so a view that reaches the app can always be drawn and always be read.

#### Labels never cover anything

Compose cannot lay a picture out, so it enforces only the limits above and the text version. That no text covers another is the renderer's layout: each arrow's label goes to the layout engine (ELK) with its measured size, which reserves room beside the line; a label that would still cover a box, a frame's name or another label is drawn as a numbered mark on its line, its words listed under the drawing and the reading notes saying so. It is verified in a browser, not by a test: open a page with the views, scroll each drawing into view with real wheel scrolling (the islands load only when scrolled to), and run this in the page:

```js
const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const box = (el) => { const r = el.getBBox(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
[...document.querySelectorAll('svg[role=group]')].map((svg) => {
  const boxes = [...svg.querySelectorAll('g[role=button] > rect')].map(box);
  const titles = [...svg.querySelectorAll('text[role=button]')].map(box);
  const texts = [...svg.querySelectorAll('text[data-line-label], g[data-line-mark]')].map(box);
  let n = 0;
  texts.forEach((t, i) => { n += boxes.filter((b) => hit(t, b)).length + titles.filter((f) => hit(t, f)).length + texts.filter((u, j) => j > i && hit(t, u)).length; });
  return { boxes: boxes.length, labels: texts.length, overlaps: n };
});
```

Every `overlaps` is 0 for a drawing that holds.

### `evidence.json`, `search.json`, `context/`

- `evidence.json`: per rule id, at most 15 lines of the analysed code from the place the rule cites, with the file relative to the code's root; absent when the code cannot be read.
- `search.json`: one record per node (a goal included): name, the word for its level, the parent's name, a short text; no record id. Records of the sections' own pages carry `section` and a key that says where on that page: `journey/<slug>` (journeys), `story/<place in the plan's order>` (plan), `risk/<rank>` (risks), `domain/<slug>` (architecture). Such a key is not a node.
- `context/<kind>.json`: the texts a reader copies, by node key, and `context/index.json` with each text's size in bytes. Compose assembles none of them (see Context below); it collects the files the producers wrote, checks them, and writes each text twice for the app: a real `context/<kind>/<key>.md` (what "Copy file path" and "Download" point at) and the embedded script a page reads for "Copy" from `file://`.

### Context: one catalogue, written by the owner of the node

A context is one text per node: what it is, what it holds, the rules and evidence it rests on, what it relies on and what uses it, what is unsure, where to look. The skill that produces a node writes its text (files keyed by record id; compose maps ids to node keys); the app transports it. No number bounds a text.

| Kind | Producer | Source |
|---|---|---|
| overview, area, capability, screen, layer, entry point, rule | code-analysis | the payloads' typed `context` of each place |
| risk, outside system, data entity, persona | code-analysis | the knowledge and system payloads, the persona registry |
| journey, domain, container, component | shape-target | `target/` records |
| choice, story | plan | the target's choices, the plan's decisions and stories |

Section order and labels, the same for every kind (a kind uses the sections it has): `What it is` (one sentence) · `What it does or holds` · `Rules and decisions` · `Relies on` · `Used by` · `Evidence` · `Unsure` · `Where to look`. A story keeps its tracker sections. The data form of this table is `compose/context-kinds.ts`.

Forbidden in any text: a record id, a stored enum word as a label, a review, dispute or provenance word, JSON, a diagram source, an absolute path. Compose refuses a text that names any id of any record of the case (an exact match, so no stack's id format is assumed) or a state word taken from the schemas' own literal sets, and refuses a node of a catalogue kind with no text or a text with no node.

## Corrections over the mockup's generators

Rules kept exclude rules a step changes and rules its journey drops; components are counted distinct; a step's stories exclude stories linked only through a rule they build; the capability of an area comes from the system's areas (never a fixed table); a journey's title and capability come from the facts, and from its id and actions only when absent.

## Budgets (measured on this machine)

| System | Places | Actions | Rules | Time | Case size | Peak memory |
|---|---:|---:|---:|---:|---:|---:|
| Policy Plus (analysis only) | 29 | 163 | 450 | 0.2 s | 5.1 MB | 0.18 GB |
| Policy Plus with target and plan | 29 | 163 | 450 | 0.5 s | 14.4 MB | 0.38 GB |
| Balkan Air | 150 | 829 | 909 | 0.5 s | 11.1 MB | 0.34 GB |
| Roller | 339 | 1,167 | 3,551 | 1.9 s | 63.9 MB | 1.1 GB |

The neutrality test fails when any real system takes 30 s or more. Most of a large case is `context/` (Roller: 37 MB, rules and actions); the app should load it per kind, on demand.

## Tests

`compose/build/goals.test.ts` (the goals' marks, labels and nodes, from small synthetic inputs) and `tests/goals-integrity.test.ts` (the loader's check of the goals file). Older tests, under `tests/compose/`: unit tests per module (`units.test.ts`), two runs and a moved copy identical and the exit codes (`determinism.test.ts`), and neutrality (`neutrality.test.ts`): a scan of compose's code for stack, medium and product words, and, when `COMPOSE_REAL_PAYLOADS` names a folder of `<system>/payloads` and `COMPOSE_REAL_RUN` a run's output root, real systems composed into cases of the same files and shape.
