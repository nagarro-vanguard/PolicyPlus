# Tell me once whether the workspace is ready to change

## Story

As a person using the product, I want after the sources open, one notice names the user and computer sources and says which are fully writable, which can only be viewed and which live only in memory., so that i know before I start whether my changes will be saved..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Which of "cannot be saved" and "cannot be modified" is shown for a registry source that failed its write test and which for a file source that could not be opened for writing?
- Is the status bar name of a source also the name used in the readiness notice?

## Acceptance criteria

**AC-1: A scratch space counts as writable, a registry source.**
Given a source has just been opened, when the program works out whether I can change it, then a scratch space counts as writable, a registry source counts as not writable when saving a test value to it failed, and any other source counts as not savable when its file could not be opened for writing.

**AC-2: It reads "is fully writable", "cannot be saved" (changes.**
Given a source is described to me, when its state is shown, then it reads "is fully writable", "cannot be saved" (changes work in memory only) or "cannot be modified", and anything other than fully writable counts as a problem.

**AC-3: It is one of Local GPO, Registry, File, User.**
Given a source is named, when I see its name, then it is one of Local GPO, Registry, File, User GPO, User hive or Scratch space, followed in brackets by its location or the person's account identifier when it has one.

**AC-4: I am told "Not all policy sources are fully.**
Given the sources have just opened, when either the user source or the computer source is not fully writable, then I am told "Not all policy sources are fully writable." together with the state of both; when both are fully writable, "Both the user and computer policy sources are loaded and writable." is shown only when opening was not quiet, so never when the program starts.

## Terminologies

- Fully writable: A source whose changes can be saved; not one that can only be viewed or that exists only in memory.

## Out of scope

The other tasks of this part of the product have their own stories: Reopen my last policy sources and show everything on start; Load the policy definitions I last used and recover from trouble; Set the language of the policy definition text; Release every open source when the person leaves the program; Show who made Policy Plus and which version is in use.
