import { baseOf, branchName } from "./branch";

/**
 * Runs git in the current folder.
 * @param args The git arguments.
 * @returns The trimmed output, or undefined when git failed.
 */
const git = (args: string[]): string | undefined => {
  const run = Bun.spawnSync(["git", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return run.exitCode === 0 ? run.stdout.toString().trim() : undefined;
};

const [number, title, tags, given] = process.argv.slice(2);
if (
  number === undefined ||
  title === undefined ||
  tags === undefined ||
  number === "--help" ||
  number === "-h"
) {
  console.log(
    "Usage: plan-branch.ts <number> <title> <tags> [base]\n\nRun in the repository. Prints the branch name, then the base and where it came from (`given`, the remote's default branch or the branch currently checked out), one per line; exits 1 with the reason otherwise.\n\nARGUMENTS\n  number  The work item's number.\n  title   The work item's title.\n  tags    The item's tags, comma separated.\n  base    The branch to start from.",
  );
  process.exit(
    number === undefined || title === undefined || tags === undefined ? 2 : 0,
  );
}

const named = branchName(
  number,
  title,
  tags.split(",").map((tag) => tag.trim()),
);
if ("error" in named) {
  console.log(named.error);
  process.exit(1);
}
const picked = baseOf(
  given,
  git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]),
  git(["branch", "--show-current"]) ?? "",
);
console.log(`${named.name}\n${picked.base}\n${picked.source}`);
