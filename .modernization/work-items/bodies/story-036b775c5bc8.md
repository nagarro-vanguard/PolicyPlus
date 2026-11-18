# Load policy templates from an uploaded package with the right language

## Problem

- Every later story reads policies from the loaded definitions, so loading must be exact about what it takes, refuses and reports.

## Goal

- Domain rules that take an uploaded template package (a set of named files, some in language subfolders) and pick its template files and the language file for each, load them as pairs and keep the loaded set apart from any earlier one. The service reads no folder of the person's machine; the package arrives by upload and its files are stored by Data.

## Acceptance criteria

- Given an uploaded template package holding files with names ending in .admx in any letter case at its top level, entries in subfolders and other files, when the package is loaded, then only the top-level .admx files are taken as templates; subfolder entries and other files are ignored.
- Given a template and the language subfolders of the uploaded package, when its language file is chosen, then the subfolder named exactly by the language code wins if it holds this template's file, else the first subfolder whose name starts with the same language part (before the dash, capital letters mattering) that holds it, else the en-US subfolder if it holds it; a subfolder lacking the file is skipped. The choice works on the names of the uploaded files, never on a folder of the machine.
- Given no language file in any of those places, when the template is loaded, then it is refused with "The corresponding ADML is missing" and none of its content is loaded.
- Given a template whose namespace an earlier template already holds, when it is loaded, then it is refused with "The <namespace> namespace is already owned by a different ADMX file", so one file cannot be added twice.
- Given an uploaded package where some templates are refused with a reported failure (unparsable, invalid, namespace already owned, or no usable language file), when it is loaded, then each failure is listed, the other templates still load and the structures are built from those that did.
- Given a template and its language file both load, when the build runs, then its categories, products, support rules and policies are staged and the pair is recorded as loaded under the template's namespace.
- Given no saved language code, when definition text is needed, then the computer's own language is used; otherwise the saved code is used.
- Given loaded definitions and earlier search results, when the workspace is closed or replaced, then all definitions and the previous search results are discarded.

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

- Template file: An ADMX file that defines policies, categories, products and support rules; not the language file that carries their text.
- Language file: The ADML file that holds the text of one template in one language; not the template itself.
- Template package: The set of template files and language subfolders a person uploads (or the service downloads from Microsoft) to load definitions; not a single template file.

## Out of scope

- Anything a later story builds on top of this.
