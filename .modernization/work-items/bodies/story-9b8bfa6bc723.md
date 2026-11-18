# Add a new value to a policy file by its name and data together

## Story

As a person using the product, I want a person adding a value to the selected key chooses its name and one of five kinds, then its data; the value is stored only when the data is confirmed., so that today the person is asked for the name and kind in one dialog and then the data in another; this brings name, kind and data together in one pass..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Hold a policy file's settings in memory and answer questions about them; Read typed numbers within the 32-bit and 64-bit limits.

Open points, to settle before it is built:
- Should the kind be suggested from the data (digits suggest a 32-bit number, several lines a list), stay visible and be changeable once name and data are asked together?
- Should replacing a same-named value really happen without any warning?
- The number limits (0 to 4,294,967,295 for 32-bit, 0 to 18,446,744,073,709,551,615 for 64-bit) and the refusal of unsupported kinds are stated by rules built with the number reader and value editing; does this story need to apply them to a new value's data?

## Acceptance criteria

**AC-1: They can choose a name and one of five.**
Given a key is selected, when the person adds a value, then they can choose a name and one of five kinds: String, Expandable string, List of strings, 32-bit DWord and 64-bit QWord, and the kind starts on String.

**AC-2: The typed name is used exactly as typed, even.**
Given the person confirms the name and kind, then the typed name is used exactly as typed, even if empty, together with the chosen kind.

**AC-3: No name and no kind are returned and no.**
Given the person cancels, then no name and no kind are returned and no value is stored.

**AC-4: The starting data is empty text for a text.**
Given a kind is chosen, when the data is first asked for, then the starting data is empty text for a text kind, zero for a number kind and an empty list for a list kind.

**AC-5: No value is stored; it is stored only once.**
Given a name and kind are chosen, when the person has not confirmed the data, then no value is stored; it is stored only once the data is confirmed.

**AC-6: It is replaced without any warning.**
Given a value of the same name already exists in the selected key, when the person confirms the new one, then it is replaced without any warning.

## Terminologies

- Value kind: The kind of data a value holds: string, expandable string, list of strings, 32-bit number or 64-bit number; not the value's name.

## Out of scope

The other tasks of this part of the product have their own stories: Add a new key to a policy file with its name checked; Change the data of a value in a policy file in either number form; Remove a selected value or key by deletion entry or clearing; Forget a key or value entirely; Export a policy source as a registry settings file.
