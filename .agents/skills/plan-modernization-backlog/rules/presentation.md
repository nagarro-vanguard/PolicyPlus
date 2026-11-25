# Presentation: rules

How the plan reads in the app, for the product owner and the developer who read it. The plan skill's agents write to these rules, the build of the plan and the app apply them, for any stack and any medium. The look (tokens, shell, components) is the app's: `.agents/shared/app/docs/design-language.md`, after Continuum's design language.

## What each level answers

- The plan: in what order is the system rebuilt, and what does each phase build? Phases are cards in dependency order; the order strip is as wide as the stories, never a made-up duration.
- A phase: what does it unlock, and which epics are in it? An epic row shows its title and its stories for that phase, once.
- An epic: what outcome does it deliver, and which stories build it, in order? Stories are cards in build order, each with what it waits for.
- A story: what does it deliver and why, and how do we know it is done? It opens with the story, then the numbered criteria; evidence, terms and origin are folded; the context to copy sits beside them.

## Wording the agents write

The rules for a title, `what`, `why`, a criterion and the size of a story are in `rules/stories.md`. Words are the reader's: no code word, no id, no file name in a title, a criterion or a question; evidence is shown by the build as `file:line` chips.

## Shape of the pages

- A fact is said once: a number appears once on a page, a story's title once, a rule's full text on one page (its story's criterion; the layer page keeps the original). Counts are derived by the build, never typed by an agent. Colour marks only what the plan states (the kind of a story, a challenge) and always comes with a word. A phase or epic list longer than 4 rows folds the rest behind "and N more"; a filter appears only above 15 rows.
- Blockers are shown as chips that link to the story or epic they wait for, merged with the stories whose rules it relies on, in one list.
- Everything that can be empty says so in a word (a story with no components, an epic with no journey) and is not shown as an empty section. The copy of the context is one button per page.

## Voice: what we never write

- Write like one careful colleague to another: a concrete subject and verb, one idea said once, a number or a name where an adjective would go ("fewest steps" and "plainly" need the count or the fact). State a doubt once.
- No punch line or reveal, no contrast ("not X but Y", ", not Y", "instead of" only to praise), no short line set apart for effect, no rhetorical question, no "let's" or "here's".
- No stock word that sells (robust, seamless, leverage, streamline, ensure, key as an adjective), no dash as punctuation, no list of three for rhythm, no run of sentences or items that open alike; a glossary line defines the term and stops, with no "it is not".
- Whether a title is a good one is a reader's call; the build refuses a title over 72 characters, a repeated one and one that ends in an ellipsis, the stage refuses a criterion over its word limit, and `src/lib/voice.ts` lists the tells in `language-report.json`.
