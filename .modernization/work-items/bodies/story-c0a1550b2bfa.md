# Narrow the policy list by type, state, comment and products

## Story

As a person using the product, I want a person chooses a policy type, a state, a comment status and, if wanted, supported products, and when they press OK the new limit holds those choices., so that people find the policies they need by limiting the list to what they are looking for..

## Context

This ports behaviour of the existing product, described in the attachment: 6 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show each policy's state and comment and apply the filters; Browse products, their versions and details in one view.

Open points, to settle before it is built:
- The plan says the list narrows as each choice is made with no confirming step, but the legacy rules apply the choices when OK is pressed; which moment is wanted?

## Acceptance criteria

**AC-1: The new limit keeps only managed policies, only the.**
Given a person has chosen Policy, Preference or Any for type, when they press OK, then the new limit keeps only managed policies, only the others, or has no type condition.

**AC-2: The new limit requires that state, or has no.**
Given a person has chosen Not Configured, Configured, Enabled, Disabled or Any for state, when they press OK, then the new limit requires that state, or has no state condition for Any.

**AC-3: The new limit keeps only commented policies, only uncommented.**
Given a person has chosen Yes, No or Any for Commented, when they press OK, then the new limit keeps only commented policies, only uncommented ones, or has no comment condition.

**AC-4: The product tree and both matching options cannot be.**
Given the limit choices are shown, when Supported on is unticked, then the product tree and both matching options cannot be used, and when it is ticked they can be used; they start out unusable.

**AC-5: Every product beneath it is ticked or unticked to.**
Given a person ticks or unticks a product by hand, when they do so, then every product beneath it is ticked or unticked to match; given a tick is changed by the choices themselves, then it does not spread.

**AC-6: It records every ticked product and both matching options,.**
Given a person presses OK with Supported on ticked, when the new limit is made, then it records every ticked product and both matching options, and it is accepted even when no product is ticked.

**AC-7: Any ticks and options are discarded and no support.**
Given a person presses OK with Supported on unticked, when the new limit is made, then any ticks and options are discarded and no support condition applies.

## Terminologies

- Supported on: The wish to limit the list to policies supported by chosen products; it is not the policy's own list of supported products.

## Out of scope

The other tasks of this part of the product have their own stories: Reset the limit choices or cancel them with Escape.
