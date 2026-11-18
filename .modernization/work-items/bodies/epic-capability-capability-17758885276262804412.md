# Carry over building and versioning Policy Plus

## Outcome

Stamp the program with its current Git version when it is built.

## Scope

This epic covers: Entry points without a window.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up libraries; Set up testing; Set up knowledge in code; Build the shared rules.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Build version | new | none: new in this codebase | The text Git gives to describe the commit a build was made from, shown as the program's version; it is not a hand-written release number. |
