# Apply a checked semantic policy text to the policy sources

## Story

As a person using the product, I want from a text that read correctly, the person applies its policies to the computer and user policy sources, and is told the outcome, including how many could not be applied., so that administrators move a whole set of settings in at once, and one bad policy does not stop the rest..

## Context

This ports behaviour of the existing product, described in the attachment: 5 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Clear a policy's old settings and write its chosen state; Open the policy dialog and finish it with OK, Apply or Cancel; Bring in policy settings text and check it as i...: Semantic Text Reader.

Open points, to settle before it is built:
- Should the person be told which policies failed and why, since today only the count is reported?
- Should a comment stay against a half-written policy when its writing fails, as today?

## Acceptance criteria

**AC-1: Each policy goes to the computer source or the.**
Given a text that read correctly, when it is applied, then each policy goes to the computer source or the user source according to its section.

**AC-2: They are wiped first and.**
Given a policy is applied, when its earlier settings exist, then they are wiped first and then the stated state and settings are written.

**AC-3: The comment is stored before the old settings are.**
Given a policy comes with a comment and the source keeps comments, when it is applied, then the comment is stored before the old settings are wiped and the new ones written; if the writing then fails, the new comment stays against the half-written policy.

**AC-4: Any existing comment is left alone.**
Given a policy comes with an empty comment, when it is applied, then any existing comment is left alone.

**AC-5: It is skipped and counted and the rest are.**
Given several policies, when one fails, then it is skipped and counted and the rest are still applied; only the number of failures is known, not which policy or why.

**AC-6: The person sees "Semantic Policy successfully applied."; when some.**
Given the apply has finished, when every policy was written, then the person sees "Semantic Policy successfully applied."; when some failed, they see "N out of M could not be applied."; either way the view refreshes.

## Terminologies

- Apply: Writing the policies of a checked text into the computer and user policy sources, replacing each policy's earlier settings; it is not the check, which writes nothing.
