---
name: orient-in-kb
description: Builds the model of the product a story touches, from the knowledge base read tier by tier, and names the entities it changes and the facts it could break, so the plan and the code are built on what the product must keep true.
---

# Orient In The Knowledge Base

Also takes `kbPath`: the knowledge base's folder; this stage runs only when the codebase declares one.

## Work

Read the knowledge base from its README: the top index, the areas and domains the story's words reach, a file in full only when its one line says the story may touch or break it, a neighbouring domain by its one line. Change nothing in the codebase or the knowledge base.

- Name every criterion in an `EntityTouched`: what the story creates, changes, reads or removes, and the states it moves between. A criterion that touches no entity says so, with a reason.
- Record each fact the story could break as an `InvariantAtRisk`, each journey it changes as a `JourneyAffected`, each place it meets the outside as a `SeamCrossed`. Cite a knowledge base file by its path inside `kbPath`, and name the domain's folder. When unsure, name the fact and say why in the hand-back.
- Raise a `Question`, with the answer you recommend, for what the story relies on that the knowledge base lacks, and for where the code disagrees with the knowledge base: the code says what exists, the approver decides which is meant.

## Output

The records, appended to `outputPath`.
