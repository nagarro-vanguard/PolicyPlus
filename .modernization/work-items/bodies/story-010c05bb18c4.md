# Install Microsoft's policy definitions in one go

## Story

As a person using the product, I want a person asks for Microsoft's current policy definitions and the program downloads the one fixed package, installs the templates, the regional-format language files and the English fallback in the destination, and reports the outcome., so that administrators get a working set of definitions without finding, unpacking and copying the files by hand, and learn clearly which step failed when something goes wrong..

## Context

This ports behaviour of the existing product, described in the attachment: 9 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Load policy definitions from a folder or...: Definition load coordinator; Propose the usual folder and allow another; Download the fixed Microsoft policy template package.

Open points, to settle before it is built:
- The program now downloads and unpacks the package itself rather than with the Windows installer tool: should an unreadable package still end with "Failed to extract the package." and keep the package?
- Where the program runs without administrator rights over a protected folder, should the person be told why the install failed beyond "Failed to move the ADMX files."?

## Acceptance criteria

**AC-1: All are disabled so a second download cannot start.**
Given a download is running, when the person looks at the start, close, destination and browse controls, then all are disabled so a second download cannot start and the destination cannot change, and they are enabled again when it ends.

**AC-2: The close is refused, and given none is running,.**
Given a download is running, when the person tries to close the download screen, then the close is refused, and given none is running, then the screen closes.

**AC-3: Ownership of that folder is taken and Administrators are.**
Given the destination folder written in the box already exists and the person is an administrator, when the download starts, then ownership of that folder is taken and Administrators are given full control before any file is moved, whatever folder is written in the box; a standard user skips this, and if taking control fails the download ends with "Failed to take control of the destination." and nothing is moved.

**AC-4: The person is told "Failed to extract the package.".**
Given the package is downloaded, when it is unpacked and the unpacking fails, then the person is told "Failed to extract the package." and the downloaded package is kept; when it succeeds, the downloaded package is deleted.

**AC-5: The template files go into the destination, the language.**
Given the package is unpacked, when the files are installed, then the template files go into the destination, the language files of the person's regional format language go into a folder of that name if the package holds one, and unless that language is en-US the English files also go into an en-US folder as a fallback; if the package has no en-US folder, the download stops with "Failed to move the ADMX files." after the destination files were already replaced.

**AC-6: Given files are installed into a folder, when the.**
Given files are installed into a folder, when the folder is missing it is created, and every file already there with the same name is deleted and replaced with no backup; only files directly in the source folder are installed, and a failure part-way leaves some files replaced and others not.

**AC-7: Ownership of the destination and of each existing language.**
Given the person is an administrator, when files are installed, then ownership of the destination and of each existing language folder is taken, a language folder created during the move inherits permissions from the folder above, and every installed file, including the template files in the destination, is reset to inherit permissions; a standard user changes no permissions, and a failure here ends the download with "Failed to move the ADMX files.", not the take-control message.

**AC-8: The person is told "Failed to " followed by.**
Given any step fails, when the download ends, then the person is told "Failed to " followed by the failed step, the screen stays open, the controls are enabled again and no policy folder is reported; if only removing the scratch folder fails, the person is told "Failed to remove temporary files." although all files are installed.

**AC-9: The person is asked "ADMX files downloaded successfully. Open.**
Given the download succeeded, when the scratch folder is deleted, then the person is asked "ADMX files downloaded successfully. Open them now?", the destination is reported as the new policy folder only if they answer Yes, and either answer closes the screen as done.

## Terminologies

- Policy definitions folder: The folder where the program reads Microsoft's policy templates and language files from; not the folder holding saved policy settings.
- Regional format language: The language of the person's regional settings, which can differ from the display language; the program installs its language files, with English as the fallback.
- Scratch folder: The temporary folder holding the downloaded package while it is installed; not a place the person keeps files.

## Journey

**Journey:** Install in one go

**Before:**

New journey

**After:**

1. Get the current policy definitions.
2. Wait while the definitions are installed.
3. Learn the result and use the definitions.

## Out of scope

The other tasks of this part of the product have their own stories: Propose the usual folder and allow another.
