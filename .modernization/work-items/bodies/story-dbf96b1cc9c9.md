# Choose the file for a registry export

## Story

As a person using the product, I want in the export window the person picks the name of the registry file to write, or cancels with Escape., so that the person needs to say where the exported registry file goes, or leave without exporting..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Does the person still type a file name in the web product, or is the download named automatically?

## Acceptance criteria

**AC-1: It is shown in the file box; in the.**
Given the export window is open, when the person chooses a file name, then it is shown in the file box; in the web product the file is delivered as a download rather than written to a folder.

**AC-2: It closes as cancelled and nothing is exported.**
Given the export window is open, when the person presses Escape, then it closes as cancelled and nothing is exported.

## Out of scope

The other tasks of this part of the product have their own stories: Export a branch of a policy file as a registry file.
