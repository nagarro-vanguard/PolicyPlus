# Set the language of the policy definition text

## Story

As a person using the product, I want a person names the language in which policy definition text is shown. The language is checked, remembered at once, and the person is offered a reload so it applies now., so that administrators read policy names and explanations in their own language, and they choose when to pay the cost of reloading the workspace..

## Context

This ports behaviour of the existing product, described in the attachment: 3 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Load policy definitions from a folder or...: Definition load coordinator; Load the policy definitions I last used and recover from trouble.

Open points, to settle before it is built:
- The language code is later used as a folder name, yet any text with one hyphen is accepted, including text with path characters; should the new product keep accepting it or refuse unsafe text?
- When the person answers no to the reload question, the stories state no behaviour for the workspace or for when the language applies; should the workspace stay as it is and the language apply the next time definitions are loaded?

## Acceptance criteria

**AC-1: They see "Please enter a valid language code." and.**
Given the language dialog is open, when the person confirms text that does not split into exactly two parts around a hyphen, such as "en" or "en-US-x", then they see "Please enter a valid language code." and the dialog stays open.

**AC-2: It is accepted without being checked as a real.**
Given the language dialog is open, when the person confirms text with exactly one hyphen, such as "en-" or "-", then it is accepted without being checked as a real language code.

**AC-3: The dialog closes without change.**
Given a language is already stored, when the person enters a code that equals it after spaces are trimmed, with upper and lower case counting as different, then the dialog closes without change.

**AC-4: It counts as a different language and is accepted.**
Given the stored language is en-US, when the person enters en-us, then it counts as a different language and is accepted.

**AC-5: The new code is saved at once.**
Given the person enters a well formed code that differs from the stored one, when they confirm, then the new code is saved at once.

**AC-6: The loaded definitions are emptied and the saved definitions.**
Given the new language was saved, when the person is asked "Language changes will take effect when ADML files are next loaded. Would you like to reload the workspace now?" and answers yes, then the loaded definitions are emptied and the saved definitions folder is loaded again with the new language.

## Terminologies

- Definition language: The language code, two parts around a hyphen such as en-US, that picks the folder the policy definition text is read from; it is not the language of the program's own screens.

## Journey

**Journey:** Name the language, then reload

**Before:**

New journey

**After:**

1. Say which language the definition text should use
2. Have the language remembered and applied

## Out of scope

The other tasks of this part of the product have their own stories: Tell me once whether the workspace is ready to change; Reopen my last policy sources and show everything on start; Load the policy definitions I last used and recover from trouble; Release every open source when the person leaves the program; Show who made Policy Plus and which version is in use.
