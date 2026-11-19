# Narrative: rules

How the app talks about the system. It is read by business analysts, product owners, architects and the people who decide with them, and parts of it will be lifted into a proposal. Every page, figure and sentence the build writes itself follows these rules, for any stack and any medium.

## Voice

- Lead with what a thing means for the business; a name from the code comes after, smaller, as evidence.
- One idea to a sentence, under 25 words. "We" for the analysis; never "I", never an agent, job or script.
- Plain words: the same word for the same thing on every page. An action is something a person, a schedule or another system starts; a layer is a group of code with one job; a business rule is a decision the code makes.

## Voice: what we never write

- Write like one careful colleague explaining to another: a concrete subject and a verb that does the work ("the program asks the registry", not "the retrieval of values is performed").
- Say it once and stop. No punch line, no reveal ("the result:", "here is the thing"), no short line set apart for effect.
- No contrast construction: not "not X but Y", not ", not Y" on the end, not "instead of" used only to praise the new way. Say what is so.
- No stock word of the kind that sells (robust, seamless, leverage, streamline, comprehensive, crucial, key as an adjective, holistic, empower, unlock) and no "serves as", "acts as", "plays a role", "in order to", "a variety of".
- No dash as punctuation, no exclamation, no rhetorical question as a heading or a lead-in, no "let's" or "here's", no promise in the future tense ("will help you").
- No list of three kept for its rhythm, no run of sentences that open alike or have one length; let length follow the thought.
- A number or a name where an adjective would go ("12 calls", "the Software key"), never "fewest steps" or "plainly" without the count or the fact. State a doubt or a limit once, where it applies, in the same plain words as a finding.

## Never shown

- A record id, in text, an address or a file name. Pages are addressed by readable names.
- A word of the analysis's own machinery (block, entry point, payload, record, verdict) or a name from its data model.
- A number without its unit ("12 calls", "7 actions"), or a claim the payloads do not hold.

## Reader first

- Start from the reader's question at each level, not from the data model: the system (what is it, how risky, how big), a capability (what does it do, what can go wrong), a screen (what can a person do here and which rules apply), a rule (what exactly must hold, where it is decided). A page answers one of them and shows only what answers it; the rest is a link or a fold.
- Overview first, then zoom and filter, then detail on demand. A list, filter, grouping or table control appears only when the list is long enough to need it (more than 15 rows); a short list is just shown.
- A fact is said once, on the page that owns it: a rule's full text lives on its layer's page and everywhere else it is a row that links there; a number appears once per page; nothing restates the lead under it.
- Every place has a short name (at most 8 words), a one-line purpose (at most 25 words) and the full text. A row shows the full sentence when it is 25 words or fewer, otherwise its first sentence; a row is never cut and never ends in an ellipsis. The short name serves the palette and the sidebar only.
- Every claim carries its evidence (`file:line`) and how sure we are (stated by the code, inferred, assumed); the page never shows one without the other.
- Nothing is empty without a word: a section with nothing in it says why and where to look instead. Volume is not a reason to print more: at 3M lines a page holds a screen's worth and folds the rest.

## Shape

- Every page opens with the question it answers; every figure has a one-line key, a text version and its own title.
- Project work (tests, build scripts) is named as such and kept out of figures about the product.
- A page that carries a number says what it counts, and the agent's captions and summaries state none: the build counts, so a caption cannot disagree with a figure.
- Every risk is shown once, with the places it reaches linked; a screen or capability that carries risks shows a marker with a word, never colour alone.
- All the sentences the build writes sit in `src/lib/copy.ts`, so they can be read as a whole and are tested against these rules.

## What the code cannot settle

- The words of the analysed code and of the agents that read it are not ours to rewrite: `language-report.json` lists the places that break these rules, the voice detectors of `src/lib/voice.ts` included (a tell is removed, a probable tell is looked at), and the run then needs action, to be reworded through the stage that wrote them. A word quoted from a window or a message is the code's, not ours.

## Where the look is written

- Colours, sizes, the shell and the components are the app's, in `.agents/shared/app/docs/design-language.md`, Continuum UI's components and theme synced into `vendor/ui` and the reader's own values in `src/styles/reader-theme.css`, and follow Continuum's design language; this file says what the pages say and show, that one says how it looks. An app change to one is checked against the other.
