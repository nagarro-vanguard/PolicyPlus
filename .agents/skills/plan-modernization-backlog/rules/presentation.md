# Presentation: rules

How the plan reads in the app, for the product owner who grooms it and the developer who builds a story. The plan skill's agents write to these rules, the build of the plan and the app apply them, for any stack and any medium. The look (tokens, shell, components) is the app's: `.agents/shared/app/docs/design-language.md`, after Continuum's design language.

## What each level answers

- The plan: in what order is the system rebuilt, and what is done? Phases are cards in dependency order; the order strip is as wide as the stories, never a made-up duration.
- A phase: what does it unlock, and which epics are in it? An epic row shows its title and its stories for that phase, once.
- An epic: what outcome does it deliver, and which stories build it, in order? Stories are cards in build order, each with its status and what it waits for.
- A story: what does it deliver and why, and how do we know it is done? It opens with the story, then the numbered criteria; evidence, terms, origin and the prompt are folded.

## Wording the agents write

- A title is a short phrase a person would say: at most 8 words for an epic or story, verb first for work ("Let a person leave without choosing a user"), full words, never cut and never ending in an ellipsis. The sentence that says more goes in `what`. A story split by the components it builds keeps the whole title of the story it came from (`splitFrom`), and each piece is titled by what its component does, with the component as `part`.
- `what` is one or two sentences, `why` one; a criterion is one `Given, when, then` of at most 60 words, and one over 40 is split by its conditions when no exact message is lost. A criterion that rests on a rule a journey step changes states what the rule does now and cites the step. A criterion that states behaviour no rule or decision states is a question in `open`, never a claim.
- Words are the reader's: no code word, no id, no file name in a title, a criterion or a question; evidence is shown by the build as `file:line` chips.
- At most 12 criteria to a story; more means two stories.

## Shape of the pages

- A fact is said once: a number appears once on a page, a story's title once, a rule's full text on one page (its story's criterion; the layer page keeps the original). Counts are derived by the build, never typed by an agent. Status colour is the only colour in the plan and always has a word. A phase or epic list longer than 4 rows folds the rest behind "and N more"; a filter appears only above 15 rows.
- Blockers are shown as chips that link to the story or epic they wait for, merged with the stories whose rules it relies on, in one list.
- Everything that can be empty says so in a word (a story with no components, an epic with no journey) and is not shown as an empty section. Copy-ready prompts are folded under one disclosure per page.

## Voice: what we never write

- Write like one careful colleague to another: a concrete subject and verb, one idea said once, a number or a name where an adjective would go ("fewest steps" and "plainly" need the count or the fact). State a doubt once.
- No punch line or reveal, no contrast ("not X but Y", ", not Y", "instead of" only to praise), no short line set apart for effect, no rhetorical question, no "let's" or "here's".
- No stock word that sells (robust, seamless, leverage, streamline, ensure, key as an adjective), no dash as punctuation, no list of three for rhythm, no run of sentences or items that open alike; a glossary line defines the term and stops, with no "it is not".
- Whether a title is a good one is a reader's call; the build refuses a title over 72 characters, a repeated one and one that ends in an ellipsis or on a word that leaves it open (a, the, of, and, their, where and the like), the stage refuses a criterion over 60 words, and `src/lib/voice.ts` lists the tells in `language-report.json`; the 8-word limit is for the writer and reviewer.
