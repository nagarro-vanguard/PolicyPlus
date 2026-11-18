# Find policies by registry key and value

## Story

As a person using the product, I want search matches policies that read or write a registry value meeting every key and value term entered., so that administrators who know a registry location find the policy that controls it..

## Context

This ports behaviour of the existing product, described in the attachment: 5 rules it must keep and the reading of the code behind them.

It relies on behaviour that other stories build first: Set, delete and forget values and key clearances in a policy file; Edit entries of a REG file within its source branch; Read and list values in policy files and registry policy keys; Forget a policy and list the registry values it touches; Replace live registry changes with the registry source model; Refuse unusable registry searches and cancel with Escape; Read and write the stored form of values in a policy file.

## Acceptance criteria

**AC-1: It matches when at least one registry value it.**
Given terms entered, when a policy is tested, then it matches when at least one registry value it reads or writes meets every term, ignoring case.

**AC-2: The whole name must match, with "*" and "?".**
Given a value-name term, when it is matched, then the whole name must match, with "*" and "?" as wildcards, otherwise equal.

**AC-3: It matches policies with a key path part equal.**
Given a key term with no backslash and no wildcard, then it matches policies with a key path part equal to it.

**AC-4: It matches policies whose key path starts with that.**
Given a key term with a backslash and no wildcard, then it matches policies whose key path starts with that text.

**AC-5: It must match the whole key path as a.**
Given a key term with "*" or "?", then it must match the whole key path as a wildcard pattern.

## Out of scope

The other tasks of this part of the product have their own stories: Refuse unusable registry searches and cancel with Escape.
