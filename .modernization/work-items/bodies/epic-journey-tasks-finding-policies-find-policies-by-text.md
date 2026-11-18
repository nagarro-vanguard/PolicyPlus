# Find policies whose title, description or comments contain words or phrases the person remembers.

## Outcome

The system looks in all three places as the words are given, and narrowing the places is an option.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Search as you type: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Plain word | new | none: new in this codebase | A typed word with no * or ?, which must appear as a whole word in a text; not a part of a longer word. |
| Wildcard word | new | none: new in this codebase | A typed word containing * or ? that stands for any matching word in a text; not a quoted phrase. |
| Phrase | new | none: new in this codebase | Words typed between double quotes that must appear together as whole words; not several separate plain words. |
| Searched place | new | none: new in this codebase | One of title, description or comment, which the person ticks to say where the words are looked for; not the user or computer area. |
