Add to the profile: the story is a modernization, and its legacy attachment (`referencePath`) is the record of what the old system does.

- Read the attachment after the epic. Each criterion `AC-n` lists the legacy rules it backs, and the attachment embeds the legacy source. A criterion may instead state the new behaviour of a step of the target journey; it lists no rule, and its words are what is built.
- The header's `steps` are the journey steps the story delivers: `system` says what the system does in each, and `changes` lists each legacy rule a step applies differently, with what it `says` today and what it does now (`to`). For a changed rule, build and prove `to`, never the old behaviour; it is the confirmed design, not a defect to question.
- Keep the behaviour of every other cited rule: its conditions, values, messages and edge cases, each proved by a test that passes on the result.
- Never copy the legacy structure, names or layers; build in the codebase's own layers and vocabulary.
- A legacy rule that looks like a defect is a `Question` that recommends replicating or fixing it, never a silent choice.
- A rule the attachment does not cite is out of scope; one that a criterion needs and the attachment lacks is a `Question`.
- The plan says, per criterion, which cited rules it keeps, which it changes and to what, and where each is proved.
