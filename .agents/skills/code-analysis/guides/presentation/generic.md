# Places: what every system has

Read by the briefing agent (`brief-the-system`) for every system, before the guide of its medium. It says how to name and judge the candidate places of the brief; the medium guides add what differs.

## Detection signals

- Always read. The medium guides are chosen by script from the system's part kinds and the kinds its code kinds suggest; this one is given whatever they are.

## What counts as a place

- A place (a `Screen` record) is where people or programs work with the system: a window, a page, a set of operations, a scheduled task, a command or a build step.
- The script finds the candidates from where the entry points lie, whoever starts them, and groups the pieces of one place (a page's markup, its code behind and its browser script) under one key. Put candidates that a person would call one place in one record; never split one.
- Test suites are grouped and named by script. Never write a `Screen` for them and never give a record the kind `test`.
- What no reader would visit (a framework hook, a container wiring, a start-up routine) is the kind `other`: its entry points are listed as unplaced, never lost.

## How to choose the kind

- Start from the candidate's `kind`, which the code suggests from its code kinds and who starts it. Change it when the files show otherwise, and only to a kind of the closed list: `screen`, `page`, `service`, `task`, `command`, `buildStep`, `other`.
- One record holds one kind. Candidates of different kinds are different places.

## Nouns

- The reader's noun for each kind is in the catalogue (`shared/catalogue/surface-kinds.json`), given in the brief's `kind` lines. Use those nouns in names and purposes; never invent another word for a kind.

## Names and purposes

- Name a place as its people say it ("Book a flight", "Manage aircraft"), never with a file, class or method name, and never with words run together. The check refuses a name equal to the code's name for the candidate.
- A purpose says in one sentence what is done there, so the place can be told from its neighbours.
- Write the system's name in `SystemWords` only when the brief, the code's own titles or the request's documents name it. Add a term only when the brief uses it and a newcomer would stop at it; kinds of data are defined by script.

## Words to avoid

- The analysis's own words: block, entry point, record, candidate, payload, job.
- Code words: class, method, handler, controller, servlet, code-behind, presenter, postback.

## Known traps

- A place named after its first entry point's purpose names one action, not the place.
- Two candidates with the same class name in different folders are different places unless their files say otherwise.
