# Work out categories, products, policies and the...: Policy option reader

## Problem

- The person browses a ready, consistent set of categories and policies, where each policy shows what it applies to and how its options behave.

## Goal

- From the validated templates, work out the categories, products, support rules, policies, their options and the screen layouts for entering values, ahead of use, with names and descriptions in the language.

## Acceptance criteria

- Given a registry value in a template, when it is read, then it is a delete marker, a number or a text by the first it contains, a value with none being a delete marker; an option's value name is its own, except a list option with a value prefix attribute (even empty) which uses the prefix, and the own name only when the prefix is empty.
- Given the options of a policy, when they are read, then kinds other than number, yes/no, text, list, choice or multi-line text are dropped without notice; a yes/no option takes its registry effect from true and false values and lists; a choice is optional unless marked required and keeps a single value, a list of values or both, and one with neither changes nothing.
- Given a number, text or list option, when it is read, then a number accepts 0 to 4,294,967,295 unless the template sets other limits, overwrites existing values unless marked soft and is stored as a number unless marked as text; a text allows 255 characters, is optional, is stored as plain text and overwrites existing values unless the template says otherwise; a list replaces other entries of its key unless marked additive, stores plain text unless marked expandable, numbers entries automatically unless the template says the person names them, and counts as prefixed only when a value prefix is given; unreadable attribute values fall back to these defaults.
- Given a policy's settings screen, when it is built, then it has a layout only when the template names one written as "$(presentation.<id>)" and the language file holds that layout; only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept and other controls are dropped without notice; a control keeps the reference id the language file gives it, or has none.
- Given the controls of a layout, when they are read, then a number box takes default value 1, shows its up-down spinner and steps by 1 unless the language file says otherwise (an unreadable value falls back to the same defaults), a check box starts unticked unless the language file marks it ticked, a drop-down list has a preselected item only when the language file names one, and combo box and drop-down entries are sorted unless the language file says not to sort them.

## Scope

- packages/contracts (the Contracts layer)
- packages/domain (the Domain layer)
- packages/database (the Database layer)
- apps/api (the API service layer)
- packages/ui (the UI components layer)
- apps/web (the Web app layer)
- apps/e2e (the End-to-end tests layer)
- packages/tooling (the Tooling layer)

## Out of scope

- Anything a later story builds on top of this.
