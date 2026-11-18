# Find policies by the words you remember

## Story

As a person using the product, I want a person types words or phrases they remember and the product finds the policies whose title, description or comments hold them, in both the user and the computer areas, with the option of narrowing where it looks., so that people often remember what a policy says but not its name or where it sits, so they find it from the words alone..

## Context

This ports behaviour of the existing product, described in the attachment: 7 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Keep and save policy comments for each source; Watch search hits arrive and stop the search when enough is found.

Open points, to settle before it is built:
- The new design says a phrase never closed is told plainly to the person, but the old rule drops it without telling them; which should the product do?
- The new design shows results as words are typed, but the old rule starts a search only when Search is pressed; should results appear while typing, and when are an empty text or no chosen place reported?

## Acceptance criteria

**AC-1: The words are told apart as plain words, wildcard.**
Given the person types words, wildcard words (with * or ?) and a quoted phrase separated by spaces, when the search starts, then the words are told apart as plain words, wildcard words and phrases, lowercased, trimmed and cleaned of the characters . , ' " ; / ! ( ) { } [ ].

**AC-2: Everything between belongs to one phrase; a single quoted.**
Given a phrase opens with a double quote, when a later word ends in a double quote, then everything between belongs to one phrase; a single quoted word such as "abc" does not close itself and also takes in the words after it.

**AC-3: That phrase is left out and the search is.**
Given a phrase was opened with a double quote and never closed, when the search starts, then that phrase is left out and the search is wider than the person may expect.

**AC-4: It is a hit only if it holds every.**
Given a text, when it is checked, then it is a hit only if it holds every plain word as a whole word, every wildcard word matches some word in it, and every phrase appears as whole words together.

**AC-5: The policy is a match.**
Given a policy and the places chosen, when any one chosen place hits (its title, its description, or a comment on it from the user's or the computer's comments), then the policy is a match.

**AC-6: No search runs and they are told "Please enter.**
Given the search text is empty, when the person starts the search, then no search runs and they are told "Please enter search terms."

**AC-7: No search runs and they see "At least one.**
Given the person has unticked In title, In description and In comment, when they start the search, then no search runs and they see "At least one attribute must be searched. Check one of the boxes and try again."

**AC-8: In title, In description and In comment are all.**
Given the person has not changed the places to search, when the search screen opens, then In title, In description and In comment are all ticked.

**AC-9: One search starts with what they entered, over both.**
Given words and at least one place are chosen, when the person starts the search, then one search starts with what they entered, over both the user and the computer areas, comments included.

## Terminologies

- Plain word: A typed word with no * or ?, which must appear as a whole word in a text; not a part of a longer word.
- Wildcard word: A typed word containing * or ? that stands for any matching word in a text; not a quoted phrase.
- Phrase: Words typed between double quotes that must appear together as whole words; not several separate plain words.
- Searched place: One of title, description or comment, which the person ticks to say where the words are looked for; not the user or computer area.

## Journey

**Journey:** Search as you type

**Before:**

New journey

**After:**

1. Say the words or phrases remembered.
2. Narrow where the words are looked for, if wanted.

## Out of scope

The other tasks of this part of the product have their own stories: Judge whether a support definition is met by the chosen products; Match policies to the registry key and value terms entered; Reopen the last search results without a new search; Show the limit in force and switch it on or off; Refuse unusable registry terms and start the search when asked.
