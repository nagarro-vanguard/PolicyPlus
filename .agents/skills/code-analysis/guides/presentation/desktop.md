# Places: desktop programs

Given to the briefing agent when the code suggests windows (`screen`): forms, dialogs and terminal screens of a program a person runs on their computer.

## Detection signals

- A candidate of kind `screen`: entry points a person starts in a window's code, such as handlers tied to a form's controls or menu items.

## What counts as a place

- One window or dialog is one place: its designer file and its code file are one candidate.
- A dialog opened from another window (shown modally) is a place of its own, named for what it lets a person do there.
- Menu and toolbar items of the main window are actions of the main window, not places.

## How to choose the kind

- `screen` for a window or dialog. A program's start routine or a command-line switch handled before any window opens is `command`.

## Nouns

- `screen` / `screens` from the catalogue; say "window" or "dialog" in a purpose only where the difference matters to a reader.

## Words to avoid

- Form, designer, control names (`ButtonBrowse`, `ToolStripMenuItem`), event names (`Click`, `KeyUp`, `Shown`), Handles clause.

## Known traps

- The window's own title (the caption it sets for itself) is the best name a person sees; read the window's code for it before naming.
- A window opened by a call is still a separate place: the code records it as a call, not as navigation, so the brief shows no link between them.
- Key and focus handlers of a dialog are actions of that dialog, never places of their own.
