# Close the raw editor with Done or Escape

## Story

As a person using the product, I want done and Escape both close the raw editor; Done closes it as accepted and Escape as cancelled, and there is no Cancel button., so that every change is applied to the loaded policy file as it is made, so closing never undoes anything and the person must know that..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: Given the raw editor is open with changes already.**
Given the raw editor is open with changes already made, when the person presses Done or Enter the editor closes as accepted, and when they press Escape it closes as cancelled; either way every change stays applied to the loaded policy file, to be saved to the stored file only when policies are saved.

## Out of scope

The other tasks of this part of the product have their own stories: See and select the keys and values of a policy file; Add a key to a policy file; Add a value to the selected key; Edit the data of a value; Mark a value for deletion or clear a key; Forget a key or a value without leaving a deletion mark; Start a registry file import from the raw editor; Start a registry file export of the selected key.
