# Browse the support rules and see which products they cover

## Story

As a person using the product, I want the person narrows the list of support rules by name, opens one to see how it matches products and which products or nested support rules it names, and follows an entry to the product details or to the nested rule in the same place., so that people can find the support rules by name and see which products and nested rules each one names..

## Context

This ports behaviour of the existing product, described in the attachment: 4 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Browse products, their versions and details in one view.

Open points, to settle before it is built:
- Should a person be able to narrow the support rules by the product they care about, not only by name, and which rule would say how?
- Should opening a support rule by double-click or Enter, and doing nothing when none is chosen, be stated as a rule, since no rule states it today?

## Acceptance criteria

**AC-1: Only support rules whose name contains the text are.**
Given support rules are loaded, when the person types text in the filter, then only support rules whose name contains the text are shown, whatever the upper or lower case; with no text every support rule is listed, ordered by name with leading spaces ignored and not shown.

**AC-2: Each entry is listed by the name of the.**
Given a support rule has entries, when its details are shown, then each entry is listed by the name of the nested support rule, otherwise the name of the product, otherwise as "<missing: " followed by the product code it names; minimum and maximum versions are listed only for product entries that name a version range, a missing bound blank.

**AC-3: It states "Match all the referenced products", "Match any.**
Given a support rule is shown, when the person reads its details, then it states "Match all the referenced products", "Match any of the referenced products", or "Do not match products" when it has no matching logic.

**AC-4: The product details are opened; when it is a.**
Given the person double-clicks an entry in the support rule details, when it is a product entry, then the product details are opened; when it is a nested support rule, then that rule is shown in the same window; when its product is missing or nothing is selected, then nothing happens.

## Terminologies

- Support rule: A named definition saying which products a policy works with, by matching all or any of them; it is not a policy or a product.

## Journey

**Journey:** Start from the product

**Before:**

New journey

**After:**

1. Say which name I care about
2. Open a support rule and see which products it covers
3. Follow an entry to its product or nested rule
