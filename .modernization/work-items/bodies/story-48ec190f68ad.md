# Pick a user profile as the user policy source

## Story

As a person using the product, I want in the user profile dialog, the person selects a profile folder and presses OK to use that profile's registry hive file (ntuser.dat) as the user policy source, or cancels with Escape. The hive's policies are brought in as an imported REG or POL file., so that administrators can edit the policies of a specific person's profile without being signed in as that person..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Where does the list of profile folders the person selects from come from, since the service reads no user folder (decision 1), and what stands in for the path C:\Users\<folder>\ntuser.dat that the legacy dialog returns?

## Acceptance criteria

**AC-1: Nothing happens; given a profile is selected,.**
Given no profile is selected, when the person presses OK, then nothing happens; given a profile is selected, then that profile's hive is returned as the chosen user source, the dialog closes as accepted and the person is asked to import that hive's policies as a REG or POL file, since the live hive is not read.

**AC-2: It closes as cancelled and nothing is chosen.**
Given the dialog is open, when the person presses Escape, then it closes as cancelled and nothing is chosen.

## Terminologies

- User hive: The file ntuser.dat in a profile folder, holding that person's registry settings; it is not the live registry of the signed-in person.
