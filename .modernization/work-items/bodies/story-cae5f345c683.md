# Choose where user and computer policies are kept

## Story

As a person using the product, I want the person says where the user policies live and where the computer policies live. For the user side they pick one of local files, the system settings store, a policy file, a particular user's policy, a user profile, or an empty scratch space. For the computer side they pick one of local files, the system settings store, a policy file, or an empty scratch space, because the per-user kinds belong to the user side only. Details are asked only for the kind chosen. They can also back out and leave everything as it was., so that so the person decides which policies they will read and edit before any work begins, without being asked for details that do not apply to their choice..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- When the person picks the per-user policy kind, which way do they name the user (type the user's identifier, or choose from a list of users), given that the rules only state the identifier is typed?

## Acceptance criteria

**AC-1: Only the box and Browse button belonging to that.**
Given the person is choosing the user policy source, when they select a kind that needs a detail (registry path, policy file name, user, or profile file), then only the box and Browse button belonging to that kind can be used and the others stay unavailable.

**AC-2: Only the box and Browse button belonging to that.**
Given the person is choosing the computer policy source, when they select a kind that needs a detail (registry path or policy file name), then only the box and Browse button belonging to that kind can be used.

**AC-3: It shows only policy files of the right type,.**
Given the person browses for a policy file on either side, when the file picker opens, then it shows only policy files of the right type, lets them name a file that does not exist yet, and does not ask for confirmation when they pick an existing one.

**AC-4: The dialog closes as cancelled and the sources already.**
Given the person is choosing sources, when they press Escape, then the dialog closes as cancelled and the sources already open are left as they were.

## Terminologies

- Policy source: The place where one side's policies are kept and read from, such as local files or a policy file; it is not the template that describes what the policies mean.
- Scratch space: An empty source that keeps nothing beyond the session; it is not a saved policy file.

## Journey

**Journey:** Say where each side lives

**Before:**

New journey

**After:**

1. tasks-choosing-and-saving-policy-sources.choose-policy-sources:say-where-each-side-lives#1
2. tasks-choosing-and-saving-policy-sources.choose-policy-sources:say-where-each-side-lives#2
3. tasks-choosing-and-saving-policy-sources.choose-policy-sources:say-where-each-side-lives#3
4. tasks-choosing-and-saving-policy-sources.choose-policy-sources:say-where-each-side-lives#5
