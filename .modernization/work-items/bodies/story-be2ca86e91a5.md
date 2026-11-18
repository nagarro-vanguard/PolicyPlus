# Show the category tree and the list of a chosen category

## Problem

- Every screen that browses policies relies on the same visibility and listing rules, so they are built once and shared.

## Goal

- Build the shared rules that decide which categories and policies are visible, how a category looks in the tree, and what the right pane lists for the chosen category.

## Acceptance criteria

- Given a category whose definition names a parent that is not among the loaded definitions, when the category is assessed, then it is orphaned.
- Given a category with no subcategories and no policies, hidden ones counted, when the category is assessed, then it is empty.
- Given a category that is both orphaned and empty, when its icon is chosen, then the orphaned icon wins over the empty icon, which wins over the normal icon.
- Given empty categories are switched off, when a category has no visible policy and no visible subcategory, then it is not visible; with them switched on it is always visible.
- Given the user, computer or both areas are chosen, when a policy is assessed, then it is visible only if it applies to a chosen area, and with Only Filtered Policies on it must also pass the filter for a chosen area it applies to, passing for either being enough.
- Given the loaded categories, when the tree is shown, then only visible categories appear, each with its kind's icon and its visible subcategories below it, sorted.
- Given a category is shown in the right pane, when the pane changes category, then the tree selection moves to that category.
- Given a category is chosen, when the right pane lists it, then an Up row marked Parent with the parent's name comes first when a parent exists, then visible subcategories by name, then visible policies by name, each policy row showing its state and comment.
- Given nothing is selected, when the description pane is shown, then the title and support lines are hidden and it reads "Select an item to see its description.".

## Scope

- packages/tooling (the Tooling layer)
- packages/domain (the Domain layer)
- packages/contracts (the Contracts layer)
- packages/data (the Data layer)
- apps/api (the Services layer)
- packages/ui (the Components layer)
- apps/web (the Screens layer)
- apps/e2e (the Black-box tests layer)

## Terminologies

- Orphaned category: A category whose definition names a parent that is not among the loaded definitions; not a category that simply has no parent.
- Empty category: A category holding no subcategories and no policies at all, hidden ones included; not one whose policies are merely hidden by a filter.

## Out of scope

- Anything a later story builds on top of this.
