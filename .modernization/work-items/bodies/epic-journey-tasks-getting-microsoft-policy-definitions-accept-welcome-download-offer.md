# Be offered the full set of policy definitions the first time the program is used on an edition that lacks them.

## Outcome

On first use the system works out whether definitions are lacking and makes a single offer, and if it is passed over the invitation stays quietly available.

## Scope

This epic covers: Main.

Out of scope: anything outside this capability of the existing product.

## Where it meets what exists

The codebase starts empty. It reuses what the earlier epics build: Set up the codebase; Set up tooling and environment; Set up testing; Set up knowledge in code; Set up platform; Build the shared components.

## Journeys

- Offer once, keep it open: a new journey in this codebase.

## Terminologies

| Term | Change | Today | Proposed |
| --- | --- | --- | --- |
| Orphaned category | new | none: new in this codebase | A category with no parent among the loaded definitions although its definition names one; not a category that simply sits at the top. |
| Empty category | new | none: new in this codebase | A category holding no subcategories and no policies at all, hidden ones counted; not a category whose policies are all hidden. |
| Group Policy support | new | none: new in this codebase | Whether the computer's Windows edition is one of the fixed list of 59 editions that have the Group Policy infrastructure; not whether definitions are loaded. |
| Welcome offer | new | none: new in this codebase | The one question shown on first use offering to download the policy definitions; not the Acquire ADMX Files command in the Help menu. |
| Offer considered | new | none: new in this codebase | The remembered fact that the welcome offer has been weighed on a first use, whether or not it was shown; not the person's answer to it. |
