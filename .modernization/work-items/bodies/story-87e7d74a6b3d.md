# Look up a user's Group Policy object by account name

## Story

As a person using the product, I want in the dialog for a user's Group Policy object, the person types an account name and presses Search to see its security identifier (SID), or types the SID directly, then confirms or cancels. The chosen SID names the object whose policy file is then imported by upload., so that administrators can point the user side of Policy Plus at one person's Group Policy object without knowing the SID by heart, and cannot go on with a SID that is not valid..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Which account names can Search translate to a SID now that no directory connection exists (decision 7 only replaces the lookup by a policy file upload), for example a fixed list, names in an uploaded file, or none so the SID is always typed?

## Acceptance criteria

**AC-1: The account's SID appears in the SID box; and.**
Given an account name is typed, when the person presses Search, then the account's SID appears in the SID box; and when the name cannot be translated, then the person is told "The name could not be translated to a SID."

**AC-2: The name is looked up first, and the dialog.**
Given a name is typed and the SID box is empty, when the person presses OK, then the name is looked up first, and the dialog stays open if no SID results.

**AC-3: They are told "The SID is not valid. Enter.**
Given the SID box holds text that is not a valid SID, when the person presses OK, then they are told "The SID is not valid. Enter a SID in the lower box, or enter a username in the top box and press Search to translate." and the dialog stays open; given a valid SID, then it is returned, the dialog closes as accepted and the person is asked to upload that object's policy file.

**AC-4: It closes as cancelled and nothing is chosen.**
Given the dialog is open, when the person presses Escape, then it closes as cancelled and nothing is chosen.

## Terminologies

- Security identifier (SID): The identifier that names one account and its Group Policy object, such as S-1-5-21-...; it is not the account's display name.
- Per-user Group Policy object: The policy kept for one named user account, used as the user policy source; it is not the local Group Policy that applies to everyone on the computer.
