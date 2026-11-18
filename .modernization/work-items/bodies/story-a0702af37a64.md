# Link loaded definitions into categories, products and policies

## Problem

- Templates refer to each other and to language text by name, so people only see a coherent catalogue if every reference resolves the same way.

## Goal

- Build the shared rules that resolve names, references and text across loaded templates and assemble the final lists of categories, products, support rules and policies.

## Acceptance criteria

- Given a name or description written as "$(string.<id>)", when it is shown, then it shows the language file's text for that id, an unknown id shows the code itself, other text is shown as written and an empty value stays empty.
- Given a reference with a colon, when it is resolved, then it uses the namespace declared for its prefix, an unknown prefix is taken as already complete, and a reference without a colon belongs to the template's own namespace.
- Given a category names a parent, when definitions are built, then it is attached under that parent found in this load or earlier ones, and when the parent is not found it has no parent but is still listed among the top-level categories.
- Given a support rule entry, when it is linked, then it links to the product its reference names, else to the support rule of that name, else stays unlinked.
- Given a policy names a category, when definitions are built, then it is listed under that category found in this load or earlier ones, and when not found it stays in the policy list but belongs to no category.
- Given a policy names a support rule, when it is built, then it shows the rule found in this load or earlier ones, and when none is found it has none.
- Given a policy names a settings screen layout, when it is built, then it gets a layout only if the name is written "$(presentation.<id>)" and the language file holds a layout with that id, and otherwise has none.
- Given the structures are built, when loading finishes, then all new categories, products, support rules and policies join the final lists and the staged items are cleared, so later files add to what is available.

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

- Reference: A name in one template that points to a category, product or support rule, possibly in another template; not the policy's own text.
- Settings screen layout: The arrangement of controls a policy shows for its options; not the options' registry effects.

## Out of scope

- Anything a later story builds on top of this.
