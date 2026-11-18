# Save policy changes to their sources

## Story

As a person using the product, I want from the main screen, the person saves comments and policy settings back to the user and computer sources. Saved files are returned as downloads, including the policy file and gpt.ini of a Group Policy source. Nothing is written to a disk of the server's host, refreshed or applied live., so that the person's work is kept in the file of the source it came from, with a clear outcome per side..

## Context

This ports behaviour of the existing product, described in the attachment: 10 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Apply one policy file's changes to another source; Set, delete and forget values and key clearances in a policy file; Edit entries of a REG file within its source branch; Read and list values in policy files and registry policy keys; Open policy sources from imported files and describe them; Read and write policy files with a byte-faithful round trip; Replace live registry changes with the registry source model; Detect the Group Policy edition and read optional attributes; Read and write the stored form of values in a policy file; Keep policy comments with their source and read comment files; Resolve where each policy source comes from and whether it can be saved.

Open points, to settle before it is built:
- What outcome wording replaces "saved to disk and invoked policy refresh", "saved to disk and applied diff to Registry", "already applied" and "will apply when policy source is closed", which describe disk writes, refreshes and live changes that decisions 1, 2 and 7 do not carry?
- What is remembered for the next start (the legacy program keeps the chosen source types and locations), and for whom, since uploaded sources have no location on the server and decision 4 stores one shared settings row for all users?

## Acceptance criteria

**AC-1: Each source's comments are written first,.**
Given sources are open, when the person saves, then each source's comments are written first, then a source is written only if fully writable (otherwise reported "not writable"); the person sees "Success." with the user and computer outcomes, or "Saving failed!" with the reason.

**AC-2: It is saved to its comment file location even.**
Given a source has a comment list, when saving, then it is saved to its comment file location even when empty; a source without comment support has no list and is skipped.

**AC-3: Each comment gets its own text id built from.**
Given comments are saved, when the file is written, then each comment gets its own text id built from the policy's namespace, policy name and a running number, and each distinct namespace gets a prefix made from its name (dots turned into underscores) and the running number.

**AC-4: Every comment and text held is written to the.**
Given comments are saved, when the file is written, then every comment and text held is written to the target file in schema version 1.0, replacing what the file held, and the file is offered as a CMTX download.

**AC-5: The Registry.pol and gpt.ini are produced with the version.**
Given a local Group Policy source, when saved, then the Registry.pol and gpt.ini are produced with the version raised and offered as downloads, and the outcome tells that the files were produced for download; no policy refresh, Windows edition check or live registry difference is applied.

**AC-6: Its Registry.pol is produced, its gpt.ini version is raised,.**
Given a per-user GPO source, when saved, then its Registry.pol is produced, its gpt.ini version is raised, both are offered as downloads, and the outcome tells that the files were produced for download; no policy refresh is invoked.

**AC-7: The outcome tells that the file was produced for.**
Given a POL file, registry, user hive or Scratch space source, when saved, then the outcome tells that the file was produced for download (POL file, registry and user hive sources, which are REG or POL files) or "discarded" (Scratch space); nothing is applied live and no change waits for a source to close.

**AC-8: A new gpt.ini is written with the General section,.**
Given a Group Policy source whose gpt.ini does not exist, when saved, then a new gpt.ini is written with the General section, both extension-name lines and Version 65537.

**AC-9: Its Version is raised by 1 for a machine.**
Given a gpt.ini exists, when updated, then its Version is raised by 1 for a machine source and by 65536 for a user source, and set to 65537 when no Version line exists.

**AC-10: They are added; when present, they are left untouched.**
Given a gpt.ini is updated, when the Machine and User extension-name lines for the registry policy are missing, then they are added; when present, they are left untouched.

## Terminologies

- gpt.ini: The small file next to a Group Policy source's policy file that holds its version number and extension lines; it is not the policy file itself.

## Journey

**Journey:** Save policies

**Before:**

New journey

**After:**

1. Choose the save command
2. Comments are written for each source
3. Each writable source is saved
4. See the outcome for the user and computer sides

## Out of scope

The other tasks of this part of the product have their own stories: Open the chosen policy sources.
