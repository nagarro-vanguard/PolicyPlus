# How it runs

- **Script:** `S/explain-how-it-runs.ts`; one study per framework and platform and group of the parts it runs, `how-it-runs/study-how-it-runs` and its review, all side by side, each writing facts on the catalogue's questions. Once every study is decided, `finish` lists the concluding jobs, `topics/write-topic-answers` and its review: the parts' topics holding several facts first, then the system's; it writes the accepted facts and conclusions in one commit once none is to fix or to run.
- **The stage's audit:** once the facts are written, `next` dispatches `review/review-agent-findings` once more, as `the stage audit`, over every accepted fact and the pages, once; what it challenges reopens the jobs that own it, by script, and their own reviews judge the fixes. Dispatch it like any review.
- **At done:** go on to the Map. What the stage's audit left that no job could take is the operator's, in `show`.
