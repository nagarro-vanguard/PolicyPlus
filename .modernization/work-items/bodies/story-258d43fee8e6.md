# Offer the choices for deleting a selected key

## Story

As a person using the product, I want let a person who deletes a key choose between clearing everything, clearing while keeping existing ordinary values, or deleting one value by a typed name., so that the three outcomes for a key are genuinely different, so the person decides which one the file records, and backing out changes nothing..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Hold a policy file's settings in memory and answer questions about them; Mark a selected value for deletion in one step.

## Acceptance criteria

**AC-1: None is chosen, and confirming with none chosen does.**
Given the delete dialog for a key has just opened, when the person looks at the choices, then none is chosen, and confirming with none chosen does nothing.

**AC-2: All values of the key are removed and the.**
Given the person chooses to clear everything, when they confirm, then all values of the key are removed and the key is marked cleared, with no further input asked.

**AC-3: The key is marked cleared and only its existing.**
Given the person chooses to clear first and keep existing values, when they confirm, then the key is marked cleared and only its existing direct values with ordinary content are put back.

**AC-4: Those deletion entries are lost and the values of.**
Given the key holds deletion entries or sub-keys with values, when the person clears first and keeps existing values, then those deletion entries are lost and the values of sub-keys are not put back.

**AC-5: The value name box can be typed in; given.**
Given the person chooses to delete one value, when the dialog shows, then the value name box can be typed in; given any other choice, then it cannot be typed in.

**AC-6: It is refused and they are told "You must.**
Given the person chooses to delete one value and leaves the name empty, when they confirm, then it is refused and they are told "You must enter a value name.".

**AC-7: The choice is accepted and any value of that.**
Given the person chooses to delete one value and types a name, when they confirm, then the choice is accepted and any value of that name, whether or not it exists, is removed and replaced by a deletion entry.

**AC-8: Nothing in the file changes.**
Given the delete dialog is open, when the person cancels or presses Escape, then nothing in the file changes.

## Terminologies

- Cleared key: A key marked so that all its values are removed on the machine; it is not the same as forgetting the key, which removes it from the file.
