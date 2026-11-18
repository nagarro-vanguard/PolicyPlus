# Choose an exported settings file and have its key prefix worked out

## Story

As a person using the product, I want a person starts an import by choosing an exported machine-settings file. The system checks the file is a genuine export, reads its keys, removals, deletions and values, works out the key prefix from the first key, and warns when the file holds default values or the prefix could not be worked out. The person gives a prefix only when none was worked out., so that the person brings settings from another machine without typing a prefix by hand, and learns at once when the file is not a genuine export or the prefix is unknown. The person can also close the import window with Escape..

## Context

This ports behaviour of the existing product, described in the attachment: 12 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Provide an empty scratch source and policy files on the machine; Open the chosen policy sources and keep the view on a visible category; Let a person leave the user entry without choosing a user.

Open points, to settle before it is built:
- How does the person choose whether the settings go into the user or the computer policy source, and at which point of the import?
- Does the person see a summary of what the file contains (keys, removals, deletions, values) and how its keys will be named, before the settings are applied?
- Can the person leave in other ways than pressing Escape, and does leaving change anything?

## Acceptance criteria

**AC-1: Only exported settings files are offered.**
Given the person is choosing the exported settings file, when the file chooser opens, then only exported settings files are offered.

**AC-2: It is refused with the message "Incorrect REG signature".**
Given the first line of the chosen file is not the standard export header, when the file is read, then it is refused with the message "Incorrect REG signature".

**AC-3: Those lines are ignored.**
Given a file with blank lines and lines starting with a semicolon, when it is read, then those lines are ignored.

**AC-4: The whole key is marked for removal; otherwise the.**
Given a key heading that starts with a minus sign, when the file is read, then the whole key is marked for removal; otherwise the heading opens a key whose values follow.

**AC-5: It is that key's default value with an empty.**
Given a value line that starts with an at sign, when the file is read, then it is that key's default value with an empty name, and the file is reported as holding default values when any value has an empty name.

**AC-6: It is read as a value to delete, as.**
Given a value written as a bare minus sign, as quoted text, as a number, or as raw bytes (whose kind is given in brackets, or plain binary when none is given), when the file is read, then it is read as a value to delete, as text, as a number or as bytes in turn; data in none of these forms is kept as a value with no data and no type, without an error.

**AC-7: The prefix is worked out from the first key.**
Given a chosen file and an empty prefix, when the file is chosen, then the prefix is worked out from the first key only: for a first key that begins with HKEY_USERS it is that top-level section plus the next part of the key, which names a user account; for any other first key, including HKEY_CURRENT_USER, it is the top-level section alone; a first key with no further backslash gives an empty prefix; and a file with no keys gets HKEY_LOCAL_MACHINE followed by a backslash.

**AC-8: The person is warned "This REG file contains data.**
Given the chosen file holds default values and the prefix was empty, when the prefix is worked out, then the person is warned "This REG file contains data for default values, which cannot be applied to all policy sources."

**AC-9: The person is warned only "An error occurred while.**
Given the prefix cannot be worked out, when the file is chosen, then the person is warned only "An error occurred while trying to guess the prefix." and the prefix stays empty.

**AC-10: It is refused with "Please specify a REG file.**
Given no file is named or no prefix is given, when the person asks to import, then it is refused with "Please specify a REG file to import." or "Please specify the prefix used to fully qualify paths in the REG file." respectively.

**AC-11: The window closes as cancelled.**
Given the import window is open, when the person presses Escape, then the window closes as cancelled.

## Terminologies

- Exported settings file: A text file exported from the machine's settings editor that lists keys and their values; it is not a policy file.
- Key prefix: The leading part of every key name in an exported settings file that is left off when the settings are saved in the policy source; it always ends in a backslash and is not the policy source's own path.
- Default value: A value that belongs to a key but has no name; it is not an ordinary named setting.
- Top-level section: The first part of a key name, such as HKEY_USERS or HKEY_CURRENT_USER, that groups the keys of the machine's settings store; it is not a single key.

## Journey

**Journey:** Prefix worked out for you

**Before:**

New journey

**After:**

1. Choose the exported settings file
2. Have the file checked and be warned about default values or an unknown prefix
3. Give a prefix only if the system could not decide one
4. Leave without importing

## Out of scope

The other tasks of this part of the product have their own stories: Bring the exported settings into the chosen policy source.
