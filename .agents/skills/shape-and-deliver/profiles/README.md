# Shape-and-deliver profiles

One file per profile; the work item's tags alone pick it (`scripts/core/workflows.ts` is the one table of tags and profiles, so this one leaves them out), and a story's design and build are one run on one branch.

| Profile     | Approver of its plan                    | Ends with                                                  |
| ----------- | --------------------------------------- | ---------------------------------------------------------- |
| `design`    | the designer or the BA, in design words | variants written; one picked                               |
| `build`     | a developer, in code terms              | code, evidence and result.json, ready for one pull request |
| `bug`       | a developer                             | code, evidence and result.json                             |
| `technical` | a developer                             | code, evidence and result.json                             |

A workflow row with `reference` also gives its agents `modernize.md`, the rules for building from a story's legacy attachment.
