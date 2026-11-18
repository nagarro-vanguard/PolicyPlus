# Start Policy Plus with the last used definitions and sources

## Story

As a person using the product, I want when a person opens the product it restores the policy definitions and the user and computer policy sources used last time, recovers with clear messages when either cannot be used, and shows the category tree ready to browse., so that administrators continue where they left off without choosing definitions and sources again, and are never left with a silent failure..

## Context

This ports behaviour of the existing product, described in the attachment: 11 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Show the category tree and the list of a chosen category; Link loaded definitions into categories, products and policies; Open policy sources from imported files and describe them; Work out whether a policy is enabled or disabled from its values; Refuse invalid template files with clear messages; Show a policy's state and comment per area; Read policies, products and options from template files; Read and list values in policy files and registry policy keys; Read settings screen layouts from language files; Detect the Group Policy edition and read optional attributes; Keep policy comments with their source and read comment files; Decide whether a policy's support rules are met; Read and write policy files with a byte-faithful round trip; Show category and policy details and keep the list tidy; Decide whether a policy is enabled, disabled or unsupported; Validate template and language files while reading them; Read support rules, products, classes and list options from templates; Filter policies and keep search results; Refuse operations a REG file source cannot support; Load policy templates from an uploaded package with the right language; Resolve where each policy source comes from and whether it can be saved; Read and write the stored form of values in a policy file; Open policy sources, load their comments and report the result; Replace live registry changes with the registry source model.

Open points, to settle before it is built:
- Which source replaces the local Group Policy files as the starting source on first start: an empty scratch space, or something the person uploads?
- Which package is the default definitions package now that the definitions folder provided by Windows cannot be read: the package downloaded from Microsoft, or an uploaded one?
- What does the person see when the stored settings cannot be read or written, given the legacy behaviour of silent defaults with nothing remembered no longer applies to the registry key?
- The legacy product sets the allowed TLS versions when it starts, but the rule belongs to downloading Microsoft's definitions and no decision says whether TLS 1.0 and 1.1 are still allowed on the server; should it move to the story that downloads definitions, and which versions are wanted?
- Which of the source kinds Local GPO, Registry, per-user GPO and user hive stay offered in the dialog, given that the live system sources are dropped and become imports, and what does their location text hold?

## Acceptance criteria

**AC-1: The saved policy sources, definitions package and policy text.**
Given the product's settings are kept as one shared stored row of settings instead of in the Windows registry, when the product starts, then the saved policy sources, definitions package and policy text language are read from that row.

**AC-2: The user source and the computer source both open.**
Given no policy sources were saved, when the product starts for the first time, then the user source and the computer source both open as the starting source with no extra location, because the service does not read the local Group Policy files of the person's computer.

**AC-3: That package is loaded from what the product stored;.**
Given a definitions package was saved last time, when the product starts, then that package is loaded from what the product stored; when none is saved, the default definitions package is loaded.

**AC-4: Yes keeps the partly loaded workspace and No fails.**
Given loading the saved definitions reports problems, when the person is asked whether to keep using the workspace, then Yes keeps the partly loaded workspace and No fails with "You decided to not use the problematic ADMX bundle.", which discards the workspace and is handled as a failed load: for a package that is not the default the person is asked to load the default, and for the default package the person is told the definitions could not be loaded.

**AC-5: The person is told that the definitions could not.**
Given the saved definitions package is not the default and fails to load, when the product starts, then the person is told that the definitions could not be loaded from the package, with the reason, and is asked "Load from the default location?"; Yes saves the default definitions package as the saved choice and No leaves the workspace empty with no further message.

**AC-6: The workspace is replaced by an empty one and.**
Given the person chose to load the default location, when loading starts, then the workspace is replaced by an empty one and the default definitions package is loaded into it.

**AC-7: The person is told "Policy definitions could not be.**
Given the default definitions package fails to load, or fails after the person chose Yes, when loading ends, then the person is told "Policy definitions could not be loaded: <reason>" and the workspace stays empty.

**AC-8: The person is told "The previous policy sources are.**
Given the previously saved policy sources cannot be opened, when the product starts, then the person is told "The previous policy sources are not accessible. The defaults will be loaded.", both sources are saved as the starting source and opened quietly, and only the kind of source is reset: any saved location text stays unchanged.

**AC-9: Each side is set to the remembered kind (Local.**
Given the policy sources dialog is opened with the last used sources, when it appears, then each side is set to the remembered kind (Local GPO, Registry, POL file, Scratch space, and for users also per-user GPO or user hive), and the registry path, file name, SID or hive path is filled in only for the kinds that carry one.

**AC-10: The secure connections it opens for that download allow.**
Given the service will later download Microsoft's policy definitions, when the product starts, then the secure connections it opens for that download allow only TLS 1.0, 1.1 and 1.2 and no other protocol.

**AC-11: The area list stands on "User or Computer", so.**
Given the workspace has loaded, when the category tree is first shown, then the area list stands on "User or Computer", so both user and computer policies are shown.

## Terminologies

- Workspace: The loaded policy definitions together with the open policy sources the person is working on; it is not a saved policy file.
- Policy source: A place where the user or the computer policies are kept and read from; it is not the definitions that describe the policies.
- Definitions package: The set of policy template files (ADMX and ADML) the workspace is loaded from, stored by the product; it is not a policy source.
- Default definitions package: The definitions package loaded when none was saved or the saved one fails; it is the replacement for the definitions folder that Windows provides in the legacy product, not the person's own package.
- Starting source: The policy source both sides open as when nothing usable was saved; in the legacy product it is the local Group Policy files, which the new product does not read from the person's computer.

## Journey

**Journey:** Open Policy Plus

**Before:**

New journey

**After:**

1. The person opens the product.
2. The product restores the saved policy sources and the saved definitions package.
3. If something cannot be used, the product says so and offers the default.
4. The person sees the category tree with both user and computer policies.

## Out of scope

The other tasks of this part of the product have their own stories: Show who made Policy Plus and which version this is; Change the language of policy text and reload; Leave Policy Plus.
