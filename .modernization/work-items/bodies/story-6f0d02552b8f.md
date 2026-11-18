# Enter whole numbers in hexadecimal when editing a number value

## Story

As a person using the product, I want when someone edits a number value in a policy file, they can switch the number field to hexadecimal, see the value as hexadecimal text, and type a hexadecimal number to set it., so that administrators often know registry numbers in hexadecimal and the values can be larger than the ordinary number field can handle; typing them as they know them avoids conversion mistakes..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- Should hexadecimal text be shown in capital letters without a prefix, as the current program does?
- What should happen when someone types a minus sign in hexadecimal mode: leave the value unchanged, or set the smallest value?

## Acceptance criteria

**AC-1: It appears as hexadecimal text, including values above 7FFFFFFF.**
Given the number field is showing a value and hexadecimal mode is on, when the value is shown, then it appears as hexadecimal text, including values above 7FFFFFFF.

**AC-2: The field behaves like an ordinary number field.**
Given hexadecimal mode is off, when the value is shown or a number is typed, then the field behaves like an ordinary number field.

**AC-3: The value becomes that number and the field shows.**
Given hexadecimal mode is on, when someone types a valid hexadecimal number and leaves the field, then the value becomes that number and the field shows it again as hexadecimal text.

**AC-4: The value is set to the largest allowed value;.**
Given hexadecimal mode is on, when someone types a hexadecimal number too large to fit, then the value is set to the largest allowed value; and when the text is not a hexadecimal number, then the value stays unchanged.

**AC-5: A test named after the rule passes for too-large.**
Given the rule for oversized and non-hexadecimal text, when the tests run, then a test named after the rule passes for too-large text, non-hexadecimal text and a valid number.

**AC-6: The screen offers the hexadecimal field and passes an.**
Given the screen that edits a number value is open, when someone switches hexadecimal mode on, then the screen offers the hexadecimal field and passes an accessibility check.

## Terminologies

- Hexadecimal mode: The setting of the number field that shows and reads the value as base-16 text; it is not a different value, only a different way of writing the same number.
- Largest allowed value: The biggest number the edited value can hold, which depends on whether the value is a 32-bit or a 64-bit number; it is not a limit on how many digits can be typed.
