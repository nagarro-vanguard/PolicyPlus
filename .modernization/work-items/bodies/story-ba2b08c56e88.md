# Let a person leave the user entry without choosing a user

## Story

As a person using the product, I want the entry where a person says which user account's own policy is wanted, built so that pressing Escape closes it with no user chosen. Turning a typed name into a security identifier (the account's unique number) and refusing an invalid one is done by the account lookup, built in its own story, which this entry hands the typed text to., so that a person who opens the entry to name a user can back out with Escape and carry on without having chosen a user..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Turn a typed user name into a valid account identifier.

Open points, to settle before it is built:
- Should the entry show the translated security identifier to the person before they confirm, as the old dialog did?
- Should leaving be possible by other means than Escape, such as a Cancel button?

## Acceptance criteria

**AC-1: The entry closes with no user chosen.**
Given the person is naming a user, when they press Escape, then the entry closes with no user chosen.
