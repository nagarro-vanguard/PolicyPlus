# Find policies by title, description or comment text

## Story

As a person using the product, I want search text is split into words, wildcards and phrases, and matches policies whose title, description or comment hit every word, wildcard and phrase of the search text., so that administrators locate policies by what they remember of their wording..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Refuse unusable text searches and cancel with Escape.

Open points, to settle before it is built:
- Should an unclosed quote still be dropped silently, as today, or should the person be told?
- Decision 6 says no comment search is carried, yet the rule matches comments from the user and computer sources; should In comment be searched or dropped?

## Acceptance criteria

**AC-1: Plain words, wildcard words (with "*" or "?") and.**
Given search text, when it is split, then plain words, wildcard words (with "*" or "?") and quoted phrases are told apart, and words are lowercased, trimmed and lose the characters . , ' " ; / ! ( ) { } [ ].

**AC-2: The phrase runs between them; a phrase never closed.**
Given a phrase opened with a double quote, when a later word ends in a double quote, then the phrase runs between them; a phrase never closed is dropped without telling the person, widening the search, and a single quoted word such as "abc" does not close itself so it absorbs the following words.

**AC-3: It is a hit only if it contains every.**
Given parsed search text, when a text is tested, then it is a hit only if it contains every plain word as a whole word, every wildcard matches some word, and every quoted phrase appears as whole words together.

**AC-4: The policy matches; any one hit is enough.**
Given the ticked attributes, when a policy's title or description hits, then the policy matches; any one hit is enough.

## Terminologies

- Wildcard word: A search word containing * or ? that matches any run or any one character; it is not a plain word.
- Hit: A policy that meets the search; it is not a policy merely listed.

## Out of scope

The other tasks of this part of the product have their own stories: Refuse unusable text searches and cancel with Escape.
