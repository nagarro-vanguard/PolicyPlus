# Show who made Policy Plus and which version is in use

## Story

As a person using the product, I want a person can ask the program about itself and is told who made it, where the project is published online and, when the program was built with one, which version it is., so that people can tell who is behind the program, find its project page, and say which version they run when they report a problem or compare with another copy..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Should the version shown in the About information be the same stamp that the build records, with nothing shown when the build has none?

## Acceptance criteria

**AC-1: A message appears that names the author of Policy.**
Given the program is open, when the person asks for the About information, then a message appears that names the author of Policy Plus and the public address of the project.

**AC-2: The message also states that version.**
Given a version was built into the program, when the person asks for the About information, then the message also states that version.

**AC-3: The message names the author and the address and.**
Given no version was built into the program, when the person asks for the About information, then the message names the author and the address and states no version.

## Terminologies

- About information: The short message that names the author, the project address and, when known, the version; it is not the policy description shown for a selected setting.
- Program version: The release label stamped into the program when it was built; it is not the version of the policy definitions that are loaded.

## Journey

**Journey:** Ask who and which version

**Before:**

New journey

**After:**

1. Find out who made this and which version I have

## Out of scope

The other tasks of this part of the product have their own stories: Tell me once whether the workspace is ready to change; Reopen my last policy sources and show everything on start; Load the policy definitions I last used and recover from trouble; Set the language of the policy definition text; Release every open source when the person leaves the program.
