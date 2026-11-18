# Check and accept a new language for policy text

## Story

As a person using the product, I want a person types the language code for policy text (such as en-US) and the product accepts it, refuses a code that is not in the form language-region, or does nothing when the code is unchanged., so that administrators read policy names and descriptions in their own language, so the product must take a code it can later use to find the matching template text..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- The rule accepts any text with exactly one hyphen and the code becomes a folder name in the legacy product; should the new product keep accepting it, or refuse characters that do not belong in a language code?

## Acceptance criteria

**AC-1: "Please enter a valid language code." is shown and.**
Given the language dialog is open, when the person confirms text that does not split into exactly two parts around one hyphen (for example "en" or "en-US-x"), then "Please enter a valid language code." is shown and the dialog stays open; any text with exactly one hyphen, including "-", "en-" or text with path characters, is accepted because it is not checked as a real language code, and the accepted text is later used as the name of the folder in which the template language files are looked for, so characters that do not belong in a folder name are not stopped here.

**AC-2: The dialog closes as cancelled and nothing changes; otherwise.**
Given the language dialog shows the stored code, when the person confirms a code that, after its spaces are trimmed, is exactly equal to the stored code, which is compared as stored without trimming (upper and lower case count as different, so en-us differs from en-US), then the dialog closes as cancelled and nothing changes; otherwise the entered code, with its spaces trimmed, is returned as accepted, and saving it is done by another story.

## Terminologies

- Policy text language: The language code (for example en-US) that decides which language of template text is shown for policies; it is not the language of the product's own screens.
