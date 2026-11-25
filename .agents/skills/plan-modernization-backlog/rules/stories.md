# Epics and stories: what they are and how they are written

The only place that says what an epic, a story and a criterion are. The writer and the reviewer read it; the gates enforce what a command can check, and each gate message names the rule here.

## Epic

- An epic is one chosen journey: its title and outcome are the journey's own words. An area (a domain, a decision's area) is an epic of technical work, named as the area is. The build derives epics; no agent writes one.

## Story

- A story is one outcome a person can see working, shown and accepted on its own: one entry point and what follows it. The same outcome by two gestures is one story; a second outcome is another story.
- Too large when its title needs "and" to join two outcomes, when its criteria start from more than one entry point, when it serves another kind of person, or when it cannot be accepted until another unbuilt story lands. No count of criteria decides size.
- Too small when it cannot be shown alone: a part with no behaviour of its own is built inside the story that needs it, not as a story.
- A technical story is for what no step serves and a command can check: setting up the layers, one decision of an area, one outside system, one store, one library of rules that several journeys rely on. One purpose each. It is never a hidden part of a user story.
- Title: what a person would say, verb first, at most 72 characters, never cut.
- `what` and `why`: one complete sentence each, in the product's words. `what` names who does it, as the journey names them (an administrator, not "a person", when the journey says so). No class, routine, file, path, id, control name.
- `terms`: every business word the owner may not know, with its meaning. `open`: behaviour no rule or decision states, one sentence each; never a claim.

## Criterion

- One `Given ..., when ..., then ...`: one observable behaviour, at most 60 words (90 when it cites several rules). Rules of one shape are cited together in one criterion.
- It rests on what it cites: a rule, a change of state, a decision, a layer or a step. Where a step changes a rule, cite the step and state what the rule does now.
- It states the rule's own values and strings, not a paraphrase, and nothing the rule does not say.

## Do not

- Restate the goal as a criterion, describe a mechanism, name a screen, a control or a stack, write two outcomes in one criterion, invent a definition, or cite a rule another story builds.
- Write a sentence a script could have produced: the plan's text is an agent's or the analysis's.
