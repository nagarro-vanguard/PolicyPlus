# Release every open source when the person leaves the program

## Story

As a person using the product, I want when the person finishes and leaves, every policy source that is open is released on its own, and the person is told only when something could not be released., so that finish the work and leave, releasing everything that was opened, without being interrupted unless resources are still held elsewhere..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Open another user's stored settings file as a source.

Open points, to settle before it is built:
- Does the program still close after the cleanup message is shown, or does the person get a chance to stay?
- When one open source cannot be released, are the other open sources still released?
- Two criteria here (releasing every open source, and unloading a user's loaded settings) come from the journey's recorded steps and from a rule that another story builds; should they be cited here or in that story?

## Acceptance criteria

**AC-1: Each open source is released on its own and.**
Given the person has policy sources open, when they leave the program, then each open source is released on its own and the program window closes.

**AC-2: Those settings are unloaded and the result says whether.**
Given one of the open sources is a user's stored settings that was loaded for work, when the person leaves the program, then those settings are unloaded and the result says whether unloading succeeded, while every other kind of source is released successfully.

**AC-3: No message is shown, because the cleanup message is.**
Given every open source released its resources, when the person leaves the program, then no message is shown, because the cleanup message is only given when any source could not release and the step is silent on success.

**AC-4: They are told "Cleanup did not complete fully because.**
Given at least one open source could not release its resources, when the person leaves the program, then they are told "Cleanup did not complete fully because the loaded resources are open in other programs."

## Terminologies

- Open source: A set of policy definitions the person has loaded to work on, such as a folder, a file or a user's stored settings; not a policy setting itself.

## Journey

**Journey:** Leave and let go

**Before:**

New journey

**After:**

1. Finish and leave
2. Know if anything was left open

## Out of scope

The other tasks of this part of the product have their own stories: Tell me once whether the workspace is ready to change; Reopen my last policy sources and show everything on start; Load the policy definitions I last used and recover from trouble; Set the language of the policy definition text; Show who made Policy Plus and which version is in use.
