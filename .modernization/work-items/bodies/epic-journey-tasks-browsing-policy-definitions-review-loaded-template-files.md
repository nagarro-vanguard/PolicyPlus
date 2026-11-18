# See which policy template files are loaded and what each one contributes.

## Outcome

The list itself shows what each file contributes; details are one step further when wanted.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Loaded template file | new | none: new in this codebase | A policy template file that has been read into the workspace and whose definitions are in use; not a file that is merely present in a folder. |
| File contribution | new | none: new in this codebase | The policies, categories, products and support rules that one template file defines; not what other loaded files define. |
