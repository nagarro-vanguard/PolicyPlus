Write the story's screens as production code, in three variants, so the picked one ships. The designer or the BA sees them side by side and picks one.

- First reason out, in the plan, the canonical patterns for this story, then the modern ones that shorten the journey: fewer clicks, more focus, less to recover from. The variants are the canonical one and two alternatives, each named by the journey gain it bets on and what it costs; when no two bets differ, say in the plan how little they differ.
- Write each variant as one folder under the variants root the layer's `## Design variants` names, with the story's number as `{story}`. A variant adds files and edits none another variant or the product uses; it keeps its own copy of a component it changes.
- Reuse the codebase's design language: its components, tokens and sibling screens. Record in a `DesignDecision` the sibling screen and lines each variant's elements mirror; restyle no component and use no raw value. Choose variants by their journey, never by which components exist, and add a component a variant needs by the codebase's own rule for adding one.
- Record each variant, and each other real choice, as a `DesignDecision`.
- Show every state a criterion names, and the usual empty, loading, filled and error states.
- Call an operation that exists. For one that does not, read a fixture inside the variant's folder and name the operation it stands for, in words, in the plan.
- Add a comparison page listing the variants.
- Use the product's words on screen.
- The plan is read by the designer or the BA, in their words and with no file or route names: screens, states, components, proposed operations, the variants and why.
