# Open a policy setting and see its current state

## Story

As a person using the product, I want a person opens a policy and sees its name, help, support text, current state (Enabled, Disabled or Not configured), its comment and the section it applies to, and can switch between Enabled, Disabled, Not configured and between Computer and User., so that administrators need to see what a policy is set to, and for which section, before they change it..

## Context

This ports behaviour of the existing product, described in the attachment: 7 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Link loaded definitions into categories, products and policies; Work out whether a policy is enabled or disabled from its values; Read and list values in policy files and registry policy keys; Read a policy's saved state from its stored values; Fill in a policy's option values; Decide whether a policy is enabled, disabled or unsupported; Show category and policy details and keep the list tidy; Refuse operations a REG file source cannot support; Read and write policy files with a byte-faithful round trip; Resolve where each policy source comes from and whether it can be saved; Open policy sources from imported files and describe them.

## Acceptance criteria

**AC-1: The Supported on box shows it, and the box.**
Given a policy that names a supported-on text, when its dialog opens, then the Supported on box shows it, and the box is empty when the policy names none.

**AC-2: It starts on Computer and the person can edit.**
Given a policy for both Computer and User, when it opens without a section chosen, then it starts on Computer and the person can edit it for either; given a policy for one section, then the section is fixed and the choice is unavailable.

**AC-3: That state is shown; for Not configured or an.**
Given a policy whose stored state in the section is Enabled or Disabled, when the dialog opens, then that state is shown; for Not configured or an unclear state, Not Configured is shown.

**AC-4: OK and Apply are available only when that section.**
Given the section being edited, when the dialog opens, then OK and Apply are available only when that section can be written to.

**AC-5: The comment box is disabled and reads "Comments unavailable.**
Given a section with no comments, when the dialog opens, then the comment box is disabled and reads "Comments unavailable for this policy source"; otherwise it shows the stored comment or is empty.

**AC-6: The option controls can be edited; when Disabled or.**
Given the dialog is open, when Enabled is picked, then the option controls can be edited; when Disabled or Not Configured is picked, they are greyed out.

**AC-7: The writability, comments and chosen state reload from that.**
Given the person picks Computer or User, when the choice changes, then the writability, comments and chosen state reload from that section; option values are replaced only for options that section stores when Enabled, and other typed values stay.

**AC-8: The width is shared between the options panel and.**
Given extra width, when the dialog is resized, then the width is shared between the options panel and the help and comment boxes.

**AC-9: Its state and comment come from the stored settings,.**
Given policy settings are stored by the service, when a section is chosen, then its state and comment come from the stored settings, not from the registry.

## Terminologies

- Policy setting: The state of one policy (Enabled, Disabled or Not configured) with its option values and comment; not the policy's definition.
- Section: Whether a policy setting is for the Computer or for the User; not a category of policies.

## Journey

**Journey:** Change a policy's setting

**Before:**

New journey

**After:**

1. Open a policy from the list
2. Read its current state, options and comment
3. Pick Enabled, Disabled or Not configured
4. Fill in the options
5. Press OK or Apply

## Out of scope

The other tasks of this part of the product have their own stories: Fill in a policy's option values; Apply option values to a policy and keep the dialog open; Save a policy's state with OK; Close the policy setting dialog and report changes.
