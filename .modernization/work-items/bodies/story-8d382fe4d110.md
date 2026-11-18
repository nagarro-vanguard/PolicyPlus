# Read, verify and apply SPOL text in the import window

## Story

As a person using the product, I want a person verifies SPOL text to see how many settings it holds, or applies it, handing the parsed script back or being told it is invalid; the text is read line by line into policy states and settings., so that people should see mistakes before anything changes..

## Context

This ports behaviour of the existing product, described in the attachment: 12 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: It must begin with the signature line "Policy Plus.**
Given SPOL text, when read, then it must begin with the signature line "Policy Plus Semantic Policy" or is refused with "Incorrect signature.".

**AC-2: Lines are split at carriage return and line feed,.**
Given SPOL text, when read, then lines are split at carriage return and line feed, so line-feed-only text is read as one line and refused with the signature message.

**AC-3: It is a user policy only when its first.**
Given a policy header, when read, then it is a user policy only when its first word is exactly U, otherwise machine; the rest is the identifier; a header without a space fails with the line number and no reason.

**AC-4: It must be Not configured, Enabled or Disabled in.**
Given a policy state, when read, then it must be Not configured, Enabled or Disabled in any letter case, otherwise refused with "Unknown policy state.".

**AC-5: Its settings are read; lines under Not configured or.**
Given an Enabled policy, when read, then its settings are read; lines under Not configured or Disabled are read as the next header.

**AC-6: # starts a whole number (failing with a conversion.**
Given a setting value, when read, then # starts a whole number (failing with a conversion message), a plain non-negative number is unsigned, True or False in any case is yes/no, single quotes are text, double quotes a list, None an empty list, anything else "Unknown option data format.".

**AC-7: One-text lines make a list and two-text lines a.**
Given a bracketed setting, when read, then one-text lines make a list and two-text lines a name and value table; with no entries a list setting loses its existing entries unless the definition keeps them, and any other kind fails to write.

**AC-8: They are recognised in any letter case, with a.**
Given comment lines, when read, then they are recognised in any letter case, with a double backslash read as one backslash and backslash n as a line break.

**AC-9: It is refused with "Escape sequence started at end.**
Given a comment ending in a lone backslash or with an unknown escape, when read, then it is refused with "Escape sequence started at end of comment." or "Unknown comment escape sequence" naming it.

**AC-10: The message ends with "(Error found on line N.)".**
Given a failure while reading, then the message ends with "(Error found on line N.)".

**AC-11: It reports "Validation successful, N policy settings found." or.**
Given SPOL text, when Verify is pressed, then it reports "Validation successful, N policy settings found." or "SPOL validation failed: " and the reason, and nothing is applied.

**AC-12: Valid text is passed back to the main window;.**
Given SPOL text, when Apply is pressed, then valid text is passed back to the main window; invalid text is refused with "The SPOL text is invalid: " and the reason.

## Out of scope

The other tasks of this part of the product have their own stories: Load a SPOL script into the import window.
