# Narrative: rules

How ux-visuals talks about the system. It is read by business analysts, product owners, architects and the people who decide with them, and parts of it will be lifted into a proposal. Every page, figure and sentence the build writes itself follows these rules, for any stack and any medium.

## Voice

- Lead with what a thing means for the business; a name from the code comes after, smaller, as evidence.
- One idea to a sentence, under 25 words. "We" for the analysis; never "I", never an agent, job or script.
- Plain words: the same word for the same thing on every page. An action is something a person, a schedule or another system starts; a layer is a group of code with one job; a business rule is a decision the code makes.
- No hedging filler, no sales words, no dash used as punctuation; say what we could not establish as plainly as what we found.

## Never shown

- A record id, in text, an address or a file name. Pages are addressed by readable names.
- A word of the analysis's own machinery (block, entry point, payload, record, verdict) or a name from its data model.
- A number without its unit ("12 calls", "7 actions"), or a claim the payloads do not hold.

## Shape

- Every page opens with the question it answers; every figure has a one-line key, a text version and its own title.
- Project work (tests, build scripts) is named as such and kept out of figures about the product.
- A page that carries a number says what it counts, and the agent's captions and summaries state none: the build counts, so a caption cannot disagree with a figure.
- Every risk is shown once, with the places it reaches linked; a screen or capability that carries risks shows a marker with a word, never colour alone.
- All the sentences the build writes sit in `src/lib/copy.ts`, so they can be read as a whole and are tested against these rules.

## What the code cannot settle

- The words of the analysed code and of the agents that read it are not ours to rewrite: `language-report.json` lists the places that break these rules, and the run then needs action, to be reworded through the stage that wrote them.
