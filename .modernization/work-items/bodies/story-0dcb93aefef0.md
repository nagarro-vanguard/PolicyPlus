# Copy a policy's settings out as ready-to-use policy text

## Story

As a person using the product, I want a person looking at a policy's text can choose whether it begins with the Policy Plus heading line and a blank line, or shows only the fragment., so that people need to take a policy's settings away as text, with the heading included when they want to import it back..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- When the person chooses Copy, is the whole text as shown (with or without the heading) selected and placed on the clipboard?
- When the text window opens, should the text take focus with all of it selected so it can be copied straight away?
- Should Ctrl+A select all the text in the box?
- Is the heading ticked by default when the text window opens?

## Acceptance criteria

**AC-1: The text starts with the heading "Policy Plus Semantic.**
Given the policy text is shown, when "Include SPOL header" is ticked, then the text starts with the heading "Policy Plus Semantic Policy" and a blank line, followed by the fragment.

**AC-2: Only the fragment is shown, without the heading and.**
Given the policy text is shown, when "Include SPOL header" is not ticked, then only the fragment is shown, without the heading and blank line.

**AC-3: The heading and blank line appear at the top.**
Given the text is shown without the heading, when the person ticks "Include SPOL header", then the heading and blank line appear at the top of the text.

## Terminologies

- Semantic policy text: The plain-text form of a policy's settings that can be copied out and imported back; it is not the policy's on-screen description.
- Policy text heading: The heading line "Policy Plus Semantic Policy" and a blank line at the top of the text that lets it be imported back; it is not part of the policy's settings.

## Journey

**Journey:** Ready to take away

**Before:**

New journey

**After:**

1. tasks-changing-policy-settings.inspect-policy-settings-as-text:ready-to-take-away#1
