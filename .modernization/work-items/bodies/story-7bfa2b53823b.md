# Start a registry file export of the selected key

## Story

As a person using the product, I want the Export button opens the registry file export window with the selected key as its starting branch and the right registry prefix., so that administrators can take one branch, or the whole policy file, out as a registry file..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: The source branch starts as that key, or empty.**
Given a key is selected, when the export window opens, then the source branch starts as that key, or empty with nothing selected; the person can type over it, the export uses the text in the box at the time, and an empty box exports all of the policy file.

**AC-2: The prefix box starts as the current-user prefix, and.**
Given the user policy file is being edited, when the export window opens, then the prefix box starts as the current-user prefix, and as the local-machine prefix for the computer policy file; it can be changed and the export uses the text in the box unchecked.

## Terminologies

- Registry prefix: The text put in front of key names in a registry file, such as the current-user or local-machine prefix; not part of the key's name in the policy file.
- Source branch: The key whose contents are exported, with everything below it; empty means the whole policy file.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Close the raw editor with Done or Escape; Add a key to a policy file; Add a value to the selected key; Edit the data of a value; Mark a value for deletion or clear a key; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor.
