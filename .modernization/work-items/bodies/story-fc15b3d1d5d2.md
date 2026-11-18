# Download and install Microsoft's policy definitions

## Story

As a person using the product, I want the person starts the download; the service fetches Microsoft's fixed policy template package, unpacks it, stores the template files and language files as the program's definitions, and tells the person whether it worked and offers to open them., so that so someone on an edition without the full set of policy definitions can get Microsoft's current ones in one step..

## Context

This ports behaviour of the existing product, described in the attachment: 8 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Stop a second download and closing while a download runs.

Open points, to settle before it is built:
- The old program unpacked the Microsoft definitions from a Windows installer package with the Windows installer tool, which the server cannot run and an archive library cannot open: how should the service unpack this package?
- The old program could leave some definitions replaced and others not when storing failed part way: should storing now be all or nothing, or may it stop part way as before?

## Acceptance criteria

**AC-1: The service fetches the one fixed package, the Windows.**
Given the person starts the download, when it runs, then the service fetches the one fixed package, the Windows 11 September 2026 Update (26H2) administrative templates, from the configured Microsoft address, and the person cannot choose another version.

**AC-2: The template files and their language files are ready.**
Given the package was fetched, when the service unpacks it, then the template files and their language files are ready to store; if unpacking fails the person is told "Failed to extract the package." and nothing is stored.

**AC-3: The template files are stored,.**
Given the files were unpacked, when they are stored, then the template files are stored, then the language files for the person's format language are stored under that language if the package holds them, and unless that language is en-US the English files are also stored as the fallback; if the package holds no English files the person is told "Failed to move the ADMX files."

**AC-4: Each is replaced by the new one with no.**
Given definitions with the same file names are already stored, when the new ones are stored, then each is replaced by the new one with no backup, and only files at the top level of the package are stored.

**AC-5: It takes no ownership of any folder and sets.**
Given the service stores files for the person, when it runs, then it takes no ownership of any folder and sets no permissions, because there is no folder of the person and the "Failed to take control of the destination." message cannot occur.

**AC-6: The message reads "Failed to " followed by that.**
Given a step fails (making room to work, downloading, unpacking, storing, or tidying up), when the person is told, then the message reads "Failed to " followed by that step, the window stays open, the controls are enabled again and no new definitions are offered; if only the final tidying of the working space fails, all definitions are already stored yet the person is told "Failed to remove temporary files." and no new definitions are offered.

**AC-7: The person is asked "ADMX files downloaded successfully. Open.**
Given the download succeeded, when the working space is cleared, then the person is asked "ADMX files downloaded successfully. Open them now?" and the new definitions are offered to the screen only on Yes; either answer closes the window as done.

## Terminologies

- Template package: The single Microsoft download that holds the template files and their language files; not the definitions already stored in the program.
- Format language: The language of the person's regional settings, which can differ from the language the program is shown in.

## Journey

**Journey:** Get Microsoft's policy definitions

**Before:**

New journey

**After:**

1. Open the download window
2. Start the download
3. Wait while the package is fetched and unpacked
4. Read the result
5. Choose to open the new definitions or not

## Out of scope

The other tasks of this part of the product have their own stories: Open the download window and name where the definitions go; Stop a second download and closing while a download runs.
