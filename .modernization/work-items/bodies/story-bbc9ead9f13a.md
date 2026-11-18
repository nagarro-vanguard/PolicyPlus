# Arrive at an item by typing its identifier

## Story

As a person using the product, I want a person types an identifier and is taken straight to the category, policy, product or support definition it names, or is told plainly that it could not be found. The text is trimmed, kinds are tried in a fixed order, and a policy identifier may carry a user or computer ending., so that go straight to a known item by typing its identifier, instead of browsing for it..

## Context

This ports behaviour of the existing product, described in the attachment: 7 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Judge whether a support definition is met by the chosen products; Browse products, their versions and details in one view; Browse the support rules and see which products they cover; Show the category tree and the policies of the chosen area; Open the chosen policy sources and keep the view on a visible category; Inspect a policy's stored setting and presentation, and copy a line; Open the policy dialog and finish it with OK, Apply or Cancel; See a policy's section, category and support at a glance; Show a category's parent and let people go up to it.

Open points, to settle before it is built:
- Should a policy hidden by the area choice or the filter still be selected on arrival, given today it leaves the category shown with nothing selected and no message?

## Acceptance criteria

**AC-1: The spaces are ignored and the kinds are tried.**
Given an identifier with spaces around it, when the person looks it up, then the spaces are ignored and the kinds are tried in the order category, product, support definition, then policy, with the first match chosen and shown with its own icon; a policy is looked up only when no other kind matches.

**AC-2: It applies to the user section; given "@C",.**
Given a policy identifier ending in "@U", when it is looked up, then it applies to the user section; given "@C", then the computer section; given no ending or any other ending, then both sections, and the ending is removed before the policy is searched so an unknown ending still finds the policy.

**AC-3: It opens; when it is not visible,.**
Given an identifier that names a category, when the category is visible, then it opens; when it is not visible, then the person is told "The category is not currently visible. Change the view settings and try again."

**AC-4: The policy opens in the editor and the policy.**
Given an identifier that names a policy, when the person arrives at it, then the policy opens in the editor and the policy list moves to it.

**AC-5: Its details open.**
Given an identifier that names a product or a support definition, when the person arrives at it, then its details open.

**AC-6: The person is told "That object could not be.**
Given an identifier of any other kind of object, when the person arrives at it, then the person is told "That object could not be found."

**AC-7: Nothing is selected and a "not found" icon is.**
Given text that matches nothing, when it is looked up, then nothing is selected and a "not found" icon is shown; given empty text, then a blank icon is shown instead; and given text that was a policy and changes to something that is not a policy, then the user or computer section found earlier is not cleared.

**AC-8: Its category is shown and the policy row is.**
Given a policy whose category is visible in the category tree, when the person moves to the policy, then its category is shown and the policy row is selected only if the policy is listed there; given a category that is not visible in the tree, then nothing happens and the person is not told.

**AC-9: Its category is shown with nothing selected and no.**
Given a policy hidden by the area choice (user, computer or both) or by the filter, when the person moves to it, then its category is shown with nothing selected and no message.

**AC-10: It opens in the computer section if either of.**
Given the policy list is showing the user or the computer settings, and the policy found by identifier belongs to the user section, the computer section or both, when the policy opens in the editor, then it opens in the computer section if either of the two is computer, otherwise in the user section if either is user, otherwise in both, so Computer wins over User.

**AC-11: Only one item is selected at a time.**
Given the policy list, when the person selects an item, then only one item is selected at a time.

## Terminologies

- Identifier: The text a person types to name one category, product, support definition or policy; not its display name.
- Section ending: An optional "@U" or "@C" at the end of a policy identifier that limits it to the user or computer section; not part of the identifier itself.

## Journey

**Journey:** Type and arrive

**Before:**

New journey

**After:**

1. Type an identifier and arrive at what it names
