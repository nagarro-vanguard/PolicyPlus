# Open policy sources from imported files and describe them

## Problem

- People choose where policies come from; each source must open, report and close predictably, with files in place of the Windows registry.

## Goal

- Domain rules (with the imported content stored by Data) for each kind of policy source: how it is opened from an uploaded POL or REG file, whether it can be changed, how it is named and how it is closed. Live registry access, loaded user hives and Active Directory are not carried; they become import and export of files (integrations.decision-2, integrations.decision-7, scope.decision-12).

## Acceptance criteria

- Given an imported REG file whose keys do not start with HKCU, HKEY_CURRENT_USER, HKU, HKEY_USERS, HKLM or HKEY_LOCAL_MACHINE (any letter case), when it is opened as a registry source, then it is refused with "The root key is not valid."; a path after the root is opened, and created in the working copy if missing. No live registry key is opened.
- Given an uploaded POL file (a POL file, the local Group Policy or a user's Group Policy object, each as a Registry.pol file), when it is opened, then its content is loaded into a stored working copy that can be changed and is saved by download; the legacy check that the file on disk can be opened for reading and writing does not apply because no file on a machine is held open.
- Given a user hive imported as a REG file, when it is opened, then its content is loaded as a source with no mounting, temporary name or privileges; if the file cannot be read, the source becomes an empty, read-only scratch source without telling the person.
- Given a Scratch space source, when it is opened, then it is an empty store that can be changed and is never saved.
- Given a registry source filled from an imported file, when writability is checked, then it is changeable as a working copy and nothing is ever written to or removed from a machine registry; saving is an export of a REG or POL file.
- Given a source, when its name is shown, then it is Local GPO, Registry, File, User GPO, User hive or Scratch space, followed in brackets by the name of the imported file (in place of a path or SID) when there is one.
- Given a number or text in an imported REG file, when a value is read from the registry source, then a missing key gives nothing, a number is held as the unsigned number policies use and environment variables in text are not expanded; no live registry is read.
- Given an unsigned 32-bit or 64-bit number in a registry source, when it is exported to a REG or POL file, then it is written with the same bits the registry would store as its signed number and the key is created in the export if missing; no live registry is written.
- Given a source being closed, when it is a user hive source, then there is nothing to unload and closing succeeds, as it does for every other kind of source; no hive is mounted or unloaded.
- Given sources closing where one could not release its resources, when closing ends, then the person is told "Cleanup did not complete fully because the loaded resources are open in other programs."

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

- Policy source: The place user or computer policy values are read from and saved to; in this product always an imported file or an empty working copy, not the live system.
- Registry source: A source filled from an imported REG file in place of the Windows registry; not a live view of the machine's registry.
- Local GPO: The computer's own Group Policy, brought in as its Registry.pol file by upload; not a domain policy.
- User GPO: A person's Group Policy object (a policy set held in the domain for that person), brought in as its Registry.pol file by upload (integrations.decision-7).
- User hive: A person's saved registry settings file, brought in as a REG file; not a registry loaded into the machine.
- SID: The security identifier that names a person's account; a User hive source may show it in brackets.
- Scratch space: An empty working copy of policies that can be changed but is never saved anywhere; not any file.

## Out of scope

- Anything a later story builds on top of this.
