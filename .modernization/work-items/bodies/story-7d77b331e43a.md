# Check every template is sound before using it

## Story

As a person using the product, I want read and validate every template beside the current definitions, skipping and listing the ones refused, and stopping at once when a template has no namespace., so that a bad download cannot spoil the definitions the person already has, and each refused template is named so the person knows what went wrong..

## Context

This ports behaviour of the existing product, described in the attachment: 13 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: It is refused with "Couldn't load <path>: The ADMX.**
Given a template that cannot be parsed as XML, when it is read, then it is refused with "Couldn't load <path>: The ADMX XML couldn't be parsed: <detail>."; given any other read problem, then it is refused with "The ADMX is invalid: <detail>".

**AC-2: It is refused as invalid: the policy definitions section;.**
Given a template in which any of these is missing or unreadable, when it is checked, then it is refused as invalid: the policy definitions section; the short label or the unique name in a namespace entry; the file name of a superseded older definition; the minimum revision (missing or not a number); a support rule's name or display name; a support reference or range without its reference, or a version bound that is not a whole number; a product's name, display name or version index; a category's name or display name; a category's parent entry or its reference when the category has content; a policy's name, display name, key or class; a policy's category or supported-on reference; a number value's value; a list item's value name; a choice item's display name; or an option's id.

**AC-3: Loading stops at once with an error, the files.**
Given a template that declares no target namespace, when the folder is loaded, then loading stops at once with an error, the files after it are not read, nothing is built and the person sees the error text.

**AC-4: It is refused with "The <namespace> namespace is already.**
Given a template whose namespace is already held by a template loaded earlier, when it is checked, then it is refused with "The <namespace> namespace is already owned by a different ADMX file".

**AC-5: Its unique name is the one listed as its.**
Given a template, when its unique name and short labels are read, then its unique name is the one listed as its target, and each short label it declares must be unique, so a repeated short label refuses the file as invalid.

**AC-6: They are kept when present; an entry without a.**
Given a template's superseded-ADM entry and minimum revision, when they are read, then they are kept when present; an entry without a file name or a minimum revision that is missing or not a number refuses the template as invalid.

**AC-7: It must contain a parent entry with a reference.**
Given a category with any content inside it, even a comment, when it is checked, then it must contain a parent entry with a reference or the template is refused as invalid; its explanation is optional.

**AC-8: Three levels are kept (product, major versions, minor versions),.**
Given products, when they are read, then three levels are kept (product, major versions, minor versions), deeper levels are not read and each version without a version index refuses the file as invalid.

**AC-9: Its unique name is the template's unique name, a.**
Given an item in a template, when it is named, then its unique name is the template's unique name, a colon and the item's own name, so equal names in different templates stay apart; given a reference to another item, then a reference containing a colon uses the unique name the template declared for the label before the colon, a label the template did not declare is taken as already complete, and a reference without a colon belongs to the template's own unique name.

**AC-10: It gives nothing; given a setting with a stated.**
Given a setting the template leaves out, when it is read, then it gives nothing; given a setting with a stated default that is left out or whose text is not valid for the kind of value expected, then that default is used.

**AC-11: It is skipped and the failure is listed, while.**
Given a template refused with a reported failure, when the folder is loaded, then it is skipped and the failure is listed, while the other files still load and the structures are built from those that loaded.

## Terminologies

- Namespace: The unique name a template declares for itself so its items stay apart from other templates' items; not a short label, which is only a label inside one template.

## Out of scope

The other tasks of this part of the product have their own stories: Find each template and its text in the perso...: Template folder scanner; Find each template and its text in the person'...: Language file locator; Work out categories, products, policies...: Definition structure builder; Offer the missing policy definitions once on first use; Switch to the new definitions in one step; Show each policy's state and comment and apply the filters.
