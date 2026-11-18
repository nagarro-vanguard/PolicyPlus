Deliver the story on its branch: the code and the tests that prove every criterion, ready for one pull request into the default branch. When the story was designed first, make the picked screens real and keep what the designer picked.

- Build each operation the story owns in the layer that owns it, and replace each fixture a picked variant read from with a query to it. Leave no stand-in.
- Move pieces more than one screen uses to the shared components; keep the rest beside their screen.
- Add a performance test only where the story states a budget.
- Record each real choice, one with an alternative and a cost, as a `DesignDecision`.
- The plan is read by a developer: the decisions, changed files and why, the diff, each criterion's proof.
