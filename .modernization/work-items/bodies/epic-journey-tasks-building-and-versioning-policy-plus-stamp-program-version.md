# Make each built copy of the program carry the version of the code it was built from.

## Outcome

The version is worked out from the code by the system every time a copy is built or released, so nobody has to remember to stamp it.

## Scope

This epic covers: Entry points without a window.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Program version | new | none: new in this codebase | The text git gives for the current commit: a tag, commit count and short commit name when tags exist, a short commit name otherwise; it is not the Windows file version or a release name. |
