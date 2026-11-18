# Load policy definitions from a folder or a single file

## Story

As a person using the product, I want a person adds a set of policy definition files, or one file, to the working set of loaded definitions, or clears that set., so that every other view needs loaded definitions; people must be able to start fresh or build up from several sources and learn which files were refused..

## Context

This ports behaviour of the existing product, described in the attachment: 6 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Link loaded definitions into categories, products and policies; Work out whether a policy is enabled or disabled from its values; Refuse invalid template files with clear messages; Show a policy's state and comment per area; Read policies, products and options from template files; Read and list values in policy files and registry policy keys; Read settings screen layouts from language files; Detect the Group Policy edition and read optional attributes; Decide whether a policy's support rules are met; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Validate template and language files while reading them; Read support rules, products, classes and list options from templates; Filter policies and keep search results; Refuse operations a REG file source cannot support; Load policy templates from an uploaded package with the right language; Read and write policy files with a byte-faithful round trip; Open policy sources from imported files and describe them.

Open points, to settle before it is built:
- The legacy program picks folders and files from the person's disk and remembers a definitions folder; with upload through the service, what is remembered for the next start?

## Acceptance criteria

**AC-1: The workspace is emptied first and only that folder's.**
Given a folder of definitions is chosen with "clear workspace" chosen, when it loads, then the workspace is emptied first and only that folder's definitions are shown; given it is not chosen, then they are added to the workspace and problems are reported without stopping the load.

**AC-2: The workspace may already be emptied or partly filled,.**
Given a folder load fails, when the person is told "The folder could not be fully added to the workspace." with the reason, then the workspace may already be emptied or partly filled, the remembered folder is unchanged and the view is rebuilt anyway.

**AC-3: It is remembered as the definitions folder for the.**
Given a folder was loaded, when "clear workspace" was chosen and the load did not fail, then it is remembered as the definitions folder for the next start; when the workspace was added to, the remembered folder is unchanged.

**AC-4: It is added to the workspace without emptying it.**
Given a single ADMX file is picked (ADMX files only), when it loads, then it is added to the workspace without emptying it and is not remembered; if it fails the person sees "The ADMX file could not be added to the workspace." with the reason.

**AC-5: It is added to the policies already loaded and.**
Given a template file is loaded alone, when it is accepted, then it is added to the policies already loaded and the structures are built; when it is refused, one failure is reported.

**AC-6: It empties at once with no confirmation and the.**
Given definitions are loaded, when the person closes the workspace, then it empties at once with no confirmation and the view is rebuilt.

## Terminologies

- Workspace: The set of policy definitions currently loaded; it is not the saved policy settings.
- Definitions folder: The folder of template files remembered for the next start; it is not a single added file.

## Journey

**Journey:** Load policy definitions

**Before:**

New journey

**After:**

1. Choose to open a folder of definitions or a single template file
2. Choose whether to clear the workspace first (folder only)
3. See any problems found while loading
4. Browse the loaded definitions

## Out of scope

The other tasks of this part of the product have their own stories: Browse categories and policies and read their descriptions; Choose which categories and areas the list shows; Merge identical user and computer policy pairs; Open the lists of loaded files, support rules and products; Use the right-click menu on categories and policies.
