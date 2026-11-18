# Stamp each build with its current Git version

## Story

As a person using the product, I want when a build is made, the program is stamped with the version that Git gives for the current commit, so the screens and the service can report which version they are. Each run replaces the previous stamp; the stamp is not kept in the repository., so that people who run or support Policy Plus can tell exactly which commit a build came from, and releases always carry the right version without anyone editing a file by hand..

## Context

This ports behaviour of the existing product, described in the attachment: 1 rules it must keep and the reading of the code behind them.

Open points, to settle before it is built:
- What should a build outside a Git checkout, with no version supplied by the release workflow, show as its version?

## Acceptance criteria

**AC-1: The program carries as its version the value taken.**
Given a Git checkout with a current commit, when a build or the release workflow runs, then the program carries as its version the value taken from Git for that commit, replacing the version of any earlier run.

**AC-2: It is the text Git's describe command gives (a.**
Given a checkout with tags, when the version is stamped, then it is the text Git's describe command gives (a tag, with commit count and short commit name when the commit is not itself tagged), and given a checkout without tags, then it is the short commit name.

**AC-3: None is committed and the version reaches the service.**
Given the repository as committed, when anyone looks for a generated version file, then none is committed and the version reaches the service and the screens only as a value passed at build time.

**AC-4: The build runs afresh with the new version instead.**
Given the Git version changes, when the build is run again, then the build runs afresh with the new version instead of reusing an earlier result, because the Git version is a declared input of the build.

## Terminologies

- Build version: The text Git gives to describe the commit a build was made from, shown as the program's version; it is not a hand-written release number.
