# Stop a second download and closing while a download runs

## Story

As a person using the product, I want while a download is running, the person cannot start another one, cannot change anything about it and cannot close the window; everything is available again when it ends., so that so a download is never started twice or cut off half way, which would leave the definitions in an unknown state..

## Context

This ports behaviour of the existing product, described in the attachment: 2 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: The close is refused and the window stays open;.**
Given a download is running, when the person tries to close the window, then the close is refused and the window stays open; given no download is running, when the person closes the window, then it closes.

**AC-2: The start and close buttons are disabled, so a.**
Given a download is running, when the person looks at the window, then the start and close buttons are disabled, so a second download cannot be started, and they are enabled again when the download ends, whether it succeeded or failed. The destination box and the browse button the old program also disabled are not carried, because there is no folder to choose.

## Out of scope

The other tasks of this part of the product have their own stories: Open the download window and name where the definitions go; Download and install Microsoft's policy definitions.
