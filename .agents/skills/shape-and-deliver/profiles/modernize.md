Add to the profile: the story is a modernization, and its legacy attachment (`referencePath`) is the record of what the old system does.

- Read the attachment after the epic. Under "What each criterion rests on", each criterion `AC-n` has the legacy code it rests on, place and verbatim code, and the doubt where a reading is disputed. A criterion may instead state the new behaviour of a step of the target journey; it names no rule, and its words are what is built.
- "Target steps and components" lists the journey steps the story delivers: what the system does in each, and each legacy rule a step applies differently, with what it does now. For a changed rule, build and prove what it does now, never the old behaviour; it is the confirmed design, not a defect to question.
- Keep the behaviour of every other cited rule: its conditions, values, messages and edge cases, each proved by a test that passes on the result.
- Never copy the legacy structure, names or layers; build in the codebase's own layers and vocabulary.
- A legacy rule that looks like a defect is a `Question` that recommends replicating or fixing it, never a silent choice.
- A rule the attachment does not cite is out of scope; one that a criterion needs and the attachment lacks is a `Question`.
- The plan says, per criterion, which cited rules it keeps, which it changes and to what, and where each is proved.
