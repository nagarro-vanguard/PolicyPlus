# Save policy changes to every chosen source in one request

## Story

As a person using the product, I want the person asks once to save. The system saves the comments, writes each source that can be fully written, makes the change take effect where it can, remembers the chosen sources for next time, and shows one outcome line per source. A local or per-user Group Policy source also gets its version file created or raised so the machine notices the change., so that administrators and power users change policy settings and expect them to be kept in their sources and to take effect, without saving each source by hand or guessing what happened to it..

## Context

This ports behaviour of the existing product, described in the attachment: 7 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Provide an empty scratch source and policy files on the machine; Keep and save policy comments for each source; Read and write policy files byte for byte; Apply one policy file's changes onto another source; Read and write the machine's live policy settings; Open the user and computer sources and remember them; Tell me once whether the workspace is ready to change.

Open points, to settle before it is built:
- What should the person see when Windows does not confirm the policy refresh, since the old program ignored that answer and could report a policy as applied when it was not?
- If the computer source saves and the user source then fails, should the computer changes stay saved and the chosen sources be remembered, or should the person be told which source failed and what was kept?

## Acceptance criteria

**AC-1: Each source's comments are saved first,.**
Given comments and policy changes on both the computer and the user source, when the person asks to save, then each source's comments are saved first, then each source that is fully writable is written, then the chosen source types and locations are remembered for the next start.

**AC-2: That source is reported as "not writable" and is.**
Given a source that is not fully writable, when the person asks to save, then that source is reported as "not writable" and is not written.

**AC-3: The person sees "Success." with the user and computer.**
Given the save finishes, when every source saved well, then the person sees "Success." with the user and computer outcomes; when a source fails, then the person sees "Saving failed!" with the reason.

**AC-4: Its policy file is written, its version file is.**
Given a local Group Policy source on a Windows edition that has Group Policy (decided by a fixed list of product edition codes), when the person saves, then its policy file is written, its version file is raised, Windows is asked to refresh policy and the outcome reads "saved to disk and invoked policy refresh".

**AC-5: Its policy file is written, its version file is.**
Given a local Group Policy source on a Windows edition that is not on that fixed list of product edition codes, when the person saves, then its policy file is written, its version file is raised, the difference between the file as last on disk (read at the moment of saving) and the new content is applied to the running account's own registry (the current user's for a user source, the machine's for a machine source), all windows are notified and the outcome reads "saved to disk and applied diff to Registry".

**AC-6: Its policy file is written, its version file is.**
Given a per-user Group Policy object, when the person saves, then its policy file is written, its version file is raised, Windows is asked to refresh user policy and the outcome reads "saved to disk and invoked policy refresh".

**AC-7: The outcome reads "saved to disk" and only the.**
Given the person saves, when the source is a POL file, then the outcome reads "saved to disk" and only the file is written; when it is a registry source, then it reads "already applied" because it was changed live; when it is a user hive, then it reads "will apply when policy source is closed"; when it is the Scratch space, then it reads "discarded".

**AC-8: A new version file is written with the General.**
Given a policy file with no version file beside it, when a save raises the version, then a new version file is written with the General section, both extension-name lines for registry policy and version 65537.

**AC-9: The version rises by 1 for a machine source.**
Given a version file that already exists, when a save raises the version, then the version rises by 1 for a machine source and by 65536 for a user source, and becomes 65537 when the file holds no version line.

**AC-10: The missing line is added and a line already.**
Given a version file that lacks the Machine or User extension-name line for registry policy, when a save raises the version, then the missing line is added and a line already present is left untouched.

## Terminologies

- Group Policy version file: The small file beside a policy file that carries a version number the machine reads to notice a change; it is not the policy file itself.
- Policy source: A place where the user or computer policies are kept, such as a POL file, the registry, a user's registry hive, a user's Group Policy object or the live system; it is not a policy definition.
- Scratch space: A policy source choice whose changes are not kept anywhere; saving it reports that the changes are discarded.

## Journey

**Journey:** Save in one go

**Before:**

New journey

**After:**

1. Ask once to save my changes and see each source's outcome.

## Out of scope

The other tasks of this part of the product have their own stories: Open the chosen policy sources and keep the view on a visible category.
