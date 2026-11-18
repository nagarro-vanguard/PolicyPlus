# Read settings screen layouts from language files

## Problem

- People set policy options through these controls, so each starts in the state Microsoft's language file intends.

## Goal

- Build the shared rules that read the controls of a policy's settings screen from a language file, with their defaults.

## Acceptance criteria

- Given a screen layout in a language file, when it is read, then only labels, number boxes, text boxes, check boxes, combo boxes, drop-down lists, list boxes and multi-line text boxes are kept and any other control is dropped without notice.
- Given a number box, when it is read, then it has default value 1, shows its spinner and steps by 1 unless the language file says otherwise, and an unreadable attribute value falls back to the same defaults.
- Given a check box, when it is shown, then it starts unticked unless the language file marks it ticked.
- Given a combo box or drop-down list, when its entries are shown, then they are sorted unless the language file says not to sort them.
- Given a drop-down list, when it is shown, then an item is preselected only when the language file names one, otherwise none is.

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

- Control: One input or label on a policy's settings screen; not the registry value it writes.

## Out of scope

- Anything a later story builds on top of this.
