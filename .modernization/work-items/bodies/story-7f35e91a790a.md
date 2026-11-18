# Find each template and its text in the person's...: Language text reader

## Problem

- A person gets definitions whose names and descriptions read in their own language, and a missing or flawed language is named instead of failing vaguely.

## Goal

- When downloaded definitions are to be used, find the template files in the chosen folder and, for each one, pick the language text that goes with it and read it, refusing flawed language text.

## Acceptance criteria

- Given a language file that cannot be parsed as XML, when it is read, then the template is refused with "The ADML XML couldn't be parsed: <detail>"; given any other read problem, then it is refused with "The ADML is invalid: <detail>".
- Given a language file, when its texts are read, then only its first text table is used and each text is kept under its id; given the same text id twice, then the file is refused as invalid and its template is not loaded.
- Given a language file, when its screen layouts are read, then only its first presentation table is used; given the same layout id twice, then the file is refused as invalid and its template is not loaded.
- Given a language file with no policy resources section, or whose revision is missing or not a number, when it is read, then it is refused as invalid and its template is not loaded.
- Given a name or description written as "$(string.<id>)", when it is shown, then the language file's text for that id appears; an unknown id shows the code itself, any other text shows as written and an empty value stays empty.
- Given a policy description, when it is prepared for display, then leading and trailing spaces are removed from every line and blank space at the end is dropped.

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
