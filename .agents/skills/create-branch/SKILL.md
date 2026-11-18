---
name: create-branch
description: Creates and switches to the branch for one work item, from an up-to-date base; use it after the issue exists and before the work starts.
---

# Create Branch

## Arguments

- `workItem` (required): the issue's URL or number, as it was created.
- `base` (optional): the branch to start from. Left out, it is the repository's default branch and the answer says so; pass it for a repository whose default is not `main`.
- `worktree` (optional): a folder to create. With it the branch is made in a new worktree and the current checkout is left alone.

## Work

1. Stop and say why if the working tree has uncommitted changes; with `worktree` this is not required, but stop if the folder already exists.
2. Read the issue's number, title and tags from the tracker, as the root `AGENTS.md`'s `## Work tracking` says; stop if it is not found.
3. Run `bun ${SKILL_ROOT}/scripts/plan-branch.ts <number> <title> <tags> [base]` in the repository: it prints the branch name, the base and where the base came from (`given`, the remote's default branch from `git symbolic-ref --short refs/remotes/origin/HEAD`, or else the branch currently checked out). Stop if it reports a problem. Say which base was used and why.
4. Without `worktree`, switch to the base, pull its latest and create the branch with `git switch -c`. With `worktree`, fetch, then run `git worktree add -b <branch> <worktree> <base>` from the repository, so the base can stay checked out elsewhere.

The branch is `<type>/<number>-<slug>`: `feat` for `functional`, `fix` for `bug`, `refactor` for `technical`; the slug is the title in kebab-case, five words or fewer.

## Output

The branch name and, with `worktree`, the worktree's path.
