# Open the policy dialog and finish it with OK, Apply or Cancel

## Story

As a person using the product, I want a person opens a policy and sees its side, state, supported-on text and comment; OK saves and closes, Apply saves and keeps the dialog open, and Cancel or any other closing still reports a change if anything was applied earlier., so that one dialog covers looking, saving and leaving, and the rest of the program knows whether anything changed..

## Context

This ports behaviour of the existing product, described in the attachment: 15 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Settle each policy's state from the evidence in its source; Show each option's stored value and save it in the right form; Clear a policy's old settings and write its chosen state; See a policy's section, category and support at a glance; Show each policy's state and comment and apply the filters; Keep and save policy comments for each source.

Open points, to settle before it is built:
- Should leaving with unsaved edits ask the person first, since today Cancel simply discards them?

## Acceptance criteria

**AC-1: It can be edited for either and starts on.**
Given a policy that applies to both computer and user, when it is opened without a side, then it can be edited for either and starts on Computer; given a policy for one side only, then it is fixed to that side and the side choice is unavailable. Switching between Computer and User moves the source, whether it can be written to and its comment to that side, and reloads the state from it; option values are replaced only for options that side stores while Enabled, and values typed earlier stay for the others.

**AC-2: The Supported on box shows the policy's supported-on name,.**
Given a policy is opened, when the person looks at the dialog, then the Supported on box shows the policy's supported-on name, or is empty when it names none.

**AC-3: That state is shown; for anything else, including an.**
Given a policy is opened, when its present state in the side being edited is Enabled or Disabled, then that state is shown; for anything else, including an unclear state, Not configured is shown.

**AC-4: Each option shows what is stored: numbers in number.**
Given the policy is Enabled, when it is opened, then each option shows what is stored: numbers in number boxes, text in text boxes and combo boxes, the matching item in drop-downs, ticked or unticked check boxes, lines in multi-line boxes and the stored list in the list editor.

**AC-5: They are greyed out; they can be edited only.**
Given Disabled or Not configured is chosen, when the person looks at the options, then they are greyed out; they can be edited only while Enabled is chosen.

**AC-6: The comment box is disabled and reads "Comments unavailable.**
Given the source holds no comments, when the dialog opens, then the comment box is disabled and reads "Comments unavailable for this policy source"; otherwise it shows the stored comment, or is empty when there is none.

**AC-7: OK and Apply are unavailable.**
Given the source cannot be written to, when the dialog is open, then OK and Apply are unavailable.

**AC-8: The dialog stays open and the visit records that.**
Given the person presses Apply, when the policy is saved, then the dialog stays open and the visit records that a change was made; given the person presses OK, then the policy is saved and the dialog closes as a change.

**AC-9: The dialog is reported as a change, and as.**
Given the person presses Cancel, when Apply was used earlier in the visit, then the dialog is reported as a change, and as a cancel otherwise; closing in any other way follows the same rule.

**AC-10: It updates in place if the current category is.**
Given a dialog was accepted, when the policy list refreshes, then it updates in place if the current category is still visible, otherwise the program moves up to the nearest visible category; nothing is written to disk until Save Policies.

**AC-11: Everything the source holds for it is cleared first;.**
Given a policy is applied, when it is saved, then everything the source holds for it is cleared first; Enabled then writes every option's current value, Disabled writes the disabled state, and Not configured leaves the policy with no values.

**AC-12: An empty comment box removes the stored comment and.**
Given the source supports comments, when the policy is applied, then an empty comment box removes the stored comment and any text replaces or adds it.

## Terminologies

- Policy state: Whether a policy is Enabled, Disabled or Not configured in the chosen side; not the values of its options.
- Side: Computer or User: the part of the system a policy setting applies to; not a category of policies.
- Apply: Saves the chosen state now and keeps the policy open; not OK, which also closes it.
- Save Policies: The command that writes all accepted changes to disk; not part of this dialog.

## Out of scope

The other tasks of this part of the product have their own stories: Show each option's stored value and save it in the right form; Change the policy state and options within their limits.
