# Show each policy's state and comment and apply the filters

## Story

As a person using the product, I want for each policy, work out its state and comment in the shown area or both, and decide whether it is listed, from the chosen area and every active part of the filter., so that the person sees each policy's setting and comment as before, and the filters keep only the policies they asked for..

## Context

This ports behaviour of the existing product, described in the attachment: 9 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the policies of the chosen area; Keep and save policy comments for each source; Judge whether a support definition is met by the chosen products.

## Acceptance criteria

**AC-1: It reads the common state followed by "(2)" when.**
Given both areas are shown and a policy applies to both, when its state is shown, then it reads the common state followed by "(2)" when both match, the computer state followed by "(C)" when only the user is Not Configured, the user state followed by "(U)" when only the computer is Not Configured, and "Mixed" otherwise.

**AC-2: It reads that area's state followed by "(C)" for.**
Given a policy that applies to one area, when its state is shown with both areas shown, then it reads that area's state followed by "(C)" for computer or "(U)" for user; with a single area shown, only that area's state appears, without a suffix.

**AC-3: It is empty when neither area has a comment,.**
Given both areas are shown, when the comment column is shown, then it is empty when neither area has a comment, shows "(multiple)" when both have one, and otherwise shows the single comment.

**AC-4: It is visible only if it applies to a.**
Given a chosen area, when a policy is considered for the list, then it is visible only if it applies to a chosen area; with "Only Filtered Policies" on, it must also pass the filter for a chosen area it applies to, and passing for either is enough.

**AC-5: Only policies whose state in the checked area is.**
Given a filter on state, when the list is built, then only policies whose state in the checked area is Configured (Enabled or Disabled), Not Configured, Disabled or Enabled, as chosen, are kept.

**AC-6: Preferences are hidden when managed policies are wanted and.**
Given a filter on managed policies, when the list is built, then preferences are hidden when managed policies are wanted and managed policies are hidden when preferences are wanted.

**AC-7: Only policies with a non-empty comment in the checked.**
Given a filter on comments, when the list is built, then only policies with a non-empty comment in the checked area, or only those with none, are kept, as chosen.

**AC-8: Only policies supported by the chosen products are kept,.**
Given a filter on products, when the list is built, then only policies supported by the chosen products are kept, honouring the options to match any product and to include policies with blank support.

**AC-9: It passes only when it passes every active part.**
Given several active parts of a filter, when a policy is judged, then it passes only when it passes every active part.

## Terminologies

- Only Filtered Policies: The switch that limits the list to policies passing the active filter; not the choice of area.

## Out of scope

The other tasks of this part of the product have their own stories: Find each template and its text in the perso...: Template folder scanner; Find each template and its text in the person'...: Language file locator; Check every template is sound before using it; Work out categories, products, policies...: Definition structure builder; Offer the missing policy definitions once on first use; Switch to the new definitions in one step.
