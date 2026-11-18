# Reopen my last policy sources and show everything on start

## Story

As a person using the product, I want when the program starts, my remembered preferences, the policy sources I used last and their comments are brought back, and the list of policies opens on the broadest view, user and computer policies together., so that i get back to the policy work where I left it without choosing anything again, and a problem with remembering never stops me..

## Context

This ports behaviour of the existing product, described in the attachment: 0 rules it must keep and the reading of the code behind them.

## Acceptance criteria

**AC-1: It carries on with the defaults, my changes to.**
Given the program's remembered preferences cannot be kept, when the program starts, then it carries on with the defaults, my changes to preferences are dropped, and I am not told, so nothing is remembered between runs.

**AC-2: Both the user source and the computer source open.**
Given I have never saved policy sources, when the program starts for the first time, then both the user source and the computer source open as the local Group Policy.

**AC-3: I am told "The previous policy sources are not.**
Given the policy sources I saved last time cannot be opened, when the program starts, then I am told "The previous policy sources are not accessible. The defaults will be loaded.", both sources are reset to the local Group Policy and opened without any further message; only the kind of source is reset and any saved location text stays.

**AC-4: Its existing comments are brought back, a missing comment.**
Given a source has a place to keep comments, when the program opens it, then its existing comments are brought back, a missing comment file simply means no comments yet, and a source whose comments cannot be read is left without comments.

**AC-5: It is on "User or Computer", so user and.**
Given the program has started, when the list of policies is shown, then it is on "User or Computer", so user and computer policies appear together.

## Terminologies

- Policy source: Where policies are read from and saved to, such as the local Group Policy, a policy file, the registry or a scratch space; it is not the definitions that describe the policies.

## Out of scope

The other tasks of this part of the product have their own stories: Tell me once whether the workspace is ready to change; Load the policy definitions I last used and recover from trouble; Set the language of the policy definition text; Release every open source when the person leaves the program; Show who made Policy Plus and which version is in use.
