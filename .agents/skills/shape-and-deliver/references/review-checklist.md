# Review checklist

## Weights

- `defect`: wrong behaviour, a criterion left unproved, a layer's rule broken, or a rule the epic states for every screen broken. It goes back to the owning agent.
- `security`: data or a secret exposed, unchecked input reaching a query or a command, or an access check removed. The run stops for an engineer.
- `note`: everything else, wording and style included.

## Dimensions

Judge each for what is missing and for what no criterion needs.

- Correct: each criterion holds in every state its input can be in; a bug's plan says whether the code or the specification is wrong.
- Secure.
- Performant: meets the work item's limits at realistic data volume.
- Readable: names are the story's words.
- Accessible.
- Resilient.
- Maintainable: each file in the layer that owns it; the design fits the architecture and the design system.
- Compatible: public behaviour the work item does not change is kept.
- Governed: the layer's AGENTS.md and the documents it points to.

## Proof

- A test reaches its criterion through its way in, can fail for the reason the criterion states, and expects a value it did not compute from the code under test. A weakened test or limit is a defect.
- A diagram settles a decision, carries the story's facts that bear on it and matches the code (`diagrams.md`); a missing one that was owed is a note.
- A design decision names a real alternative, or it is a note; one that contradicts a layer's rules is a defect.
- A design variant's every element reuses a component or token and cites the sibling screen and lines it mirrors; a restyled component, a raw value, or a component added outside the codebase's rule for adding one is a defect.
- A fact the orientation says the work could break is kept by a named change and proved by a named test.
- A new business term's definition, where the codebase keeps vocabulary tags, is in the product owner's words, says what the term is not, uses no code word, and comes from a sentence of the story or its epic; a definition no such sentence supports is a defect. A new screen carries the journey the story names; a missing or different name is a defect.
- A test that proves how a screen looks, or what a type, a lint rule or the framework already holds, is a note.
- A guess that changes what the approver gets is a question with a recommended answer.
- A change equals the plan or explains each deviation, and a bug's test failed first for the bug's reason.
