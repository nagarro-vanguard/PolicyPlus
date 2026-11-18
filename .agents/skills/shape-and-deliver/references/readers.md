# Who reads what a skill writes

Every text a skill writes has one reader. Write it for that reader, then read it again as that reader before you hand back. A skill that leaks its internals to a person has not done its task.

## The readers

- **The BA or PO** decides what the product does. Knows the product, the ask and the sketches. Does not know the code, a run's keys, or how the skills work. Reads: what changes for people, what is out of scope, the few decisions with a recommendation, what contradicts what exists.
- **The approver** (a PO or tech lead) decides whether a plan is right. Knows the product. Does not know the code or the skill. Reads: for each criterion what a person will see, what is new and what changes, the questions and risks in plain words, the size.
- **The designer** decides how it looks and flows. Knows the product, the design system and its components, and the sketches. Does not know the API, the code or how the skills work. Reads: for each screen its states and where it sits in the flow, which components are reused, changed or new, the variants and the one recommended, and what a developer's review asks them to change.
- **The stakeholder** decides why: the outcome they want. Knows the business, not the product's internals. Gives a few short sessions. Reads and sees: each variant of a design running, side by side, in the words they used; and signs off the picked one. Never a story number, a route, an operation or a state's name.
- **The engineer** decides whether code and tests are right. Knows the codebase and its stack, not the skill. Reads: changed files and why, the diff, each criterion's proof, departures from the plan. Cites files and lines; the stack's words are fine, the skill's are not.
- **The operator** gets a stopped run going. Reads: the state, what stopped it, the one thing to do, a problem with the skill itself (never a question for the approver).
- **The agent** reads the previous agent's records. Ids are its language; its hand-back is read by the reviewer and the operator, never a person who decides.

## Four channels, one per file

| Channel      | For                                     | Holds                                           | Rule                                                                                     |
| ------------ | --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Conversation | the person at the keyboard              | what needs them now, their answers, status      | one to three sentences and one thing to open; never a path, a command or an agent's name |
| Document     | a reader deciding or studying           | the decisions page, the approval page, the plan | a verdict, then the story in the reader's unit, then evidence; no command                |
| Deliverable  | the system of record                    | issues, the KB, pull requests, code             | the destination's own form; no skill words                                               |
| Internals    | the next agent, the scripts, an auditor | state, records, hand-backs, drafts              | in `internal/`; never the way a person reads something                                   |

A run folder's top level holds only what a reader opens (`.html` pages) and `internal/`. What lasts is a link: the epic, the pull request.

## Rules for a page

1. One reader, one task. The title is the task; the first line is the verdict or the ask.
2. Decisions first, each with its recommendation and what depends on it. Nothing to decide is one badge in the header.
3. Then the story in the reader's unit; evidence last, in one disclosure titled "Evidence", in the reader's words.
4. The reader's words only: the ask, the product's own words, the sketches' labels. No identifier, file, command, stage name or tool word on a page for a person who does not run the tools.
5. Markdown is rendered, not shown. An agent's text appears only through a field annotated for that reader, with a word limit.
6. No sentence describes the page: no lede, no eyebrow naming the machine, no box naming a register. A label names the subject or the task. A fact appears once. An empty section is absent.
7. A page never says "run". The agent asks in plain words and records the answer through its scripts.
8. Delete test: a sentence the reader would not miss goes.

## The reader test

Give a fresh agent only a page's text and a reader's profile. Ask what it must decide, what happens next, which words it does not understand, and which sentences it could delete. Run it when a renderer or a brief changes.
