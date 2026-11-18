# Pick a user profile to use as the policy source

## Story

As a person using the product, I want a person choosing a user policy source confirms one user profile and gets back the location of that profile's stored settings. They can also leave without choosing., so that most people edit their own profile, so the common case needs one confirmation and no searching, while leaving is always possible..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Should the person's own profile be proposed first and the other profiles on the computer be listed, with whether each can be opened now, as the old dialog did? No rule states this.
- Should leaving without choosing leave the current policy source unchanged? No rule states this beyond the choice closing as cancelled.

## Acceptance criteria

**AC-1: Nothing happens.**
Given the choice of a user profile is open, when the person confirms with no profile selected, then nothing happens.

**AC-2: The choice closes as accepted and returns the location.**
Given the choice of a user profile is open and a profile is selected, when the person confirms, then the choice closes as accepted and returns the location of that profile's settings file.

**AC-3: The choice closes as cancelled.**
Given the choice of a user profile is open, when the person presses Escape, then the choice closes as cancelled.

## Terminologies

- User profile: A person's own stored settings on the computer, which can serve as the user policy source; not the machine-wide policy settings.
- Profile settings file: The file holding a user profile's stored settings, whose location is returned once a profile is chosen; not the policy source itself.

## Journey

**Journey:** Start from my own profile

**Before:**

New journey

**After:**

1. Accept or replace the proposed profile
2. Leave without choosing
