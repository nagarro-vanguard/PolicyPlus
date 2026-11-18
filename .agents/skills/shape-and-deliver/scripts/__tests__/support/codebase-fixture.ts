import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const rootAgent = `# Shop

## Layers

| Layer | Path | Kind | Depends on |
| --- | --- | --- | --- |
| web | apps/web | code | api (its HTTP API only) |
| db | packages/db | code | - |
| api | apps/api | code | db |
| e2e | tests/e2e | test | web, api |

## Work tracking

Work items are tracker issues; a story is a sub-issue of its epic.

`;

/** What the web layer, which owns the screens, declares in its AGENTS.md. */
const screensSections = `
## Design variants

- Variants: \`apps/web/src/routes/design/{story}\`, one folder per variant.
- Picked to: \`apps/web/src/routes/**\`.
- After a pick: \`sh -c true\`.
`;

/**
 * A layer's AGENTS.md with one Verify command.
 * @param verify the Verify command
 * @returns the file's text
 */
const layerAgent = (verify: string) => `# layer

## Owns

Some code.

## Verify

- \`${verify}\`
`;

/**
 * Write files under a folder, making the folders they sit in.
 * @param root the folder
 * @param files each file's path relative to it, and its text
 */
export function writeFiles(root: string, files: Record<string, string>): void {
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), text);
    }
}

// Every commit, the tests' and the skill's own, is made with this identity: a CI machine has none.
Object.assign(process.env, {
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
});

/**
 * Run git in a folder, committing as the identity above.
 * @param root the folder
 * @param args git's arguments
 * @returns what git printed
 */
export const git = (root: string, ...args: string[]) =>
    execFileSync("git", ["-C", root, ...args], { stdio: "pipe" }).toString();

/**
 * A temporary codebase that offers the shape-and-deliver contract, as a git repository with an origin remote whose
 * default branch is main, checked out on a work item's branch: a root AGENTS.md with four layers listed out of
 * dependency order, each layer's AGENTS.md, and a .gitignore that ignores the artifacts folder.
 * @param overrides files to write over or beside the defaults before the first commit
 * @returns the codebase's absolute path
 */
export function makeCodebase(overrides: Record<string, string> = {}): string {
    const root = mkdtempSync(join(tmpdir(), "shape-and-deliver-"));
    writeFiles(root, {
        "AGENTS.md": rootAgent,
        "apps/web/AGENTS.md": `${layerAgent("echo web")}${screensSections}`,
        "apps/api/AGENTS.md": layerAgent("echo api"),
        "packages/db/AGENTS.md": layerAgent("echo db"),
        "tests/e2e/AGENTS.md": layerAgent("echo e2e"),
        ".gitignore": ".artifacts/\n",
        ...overrides,
    });
    const origin = mkdtempSync(join(tmpdir(), "shape-and-deliver-origin-"));
    execFileSync("git", ["init", "-q", "--bare", origin]);
    git(root, "init", "-q", "-b", "main");
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "start");
    git(root, "remote", "add", "origin", origin);
    git(root, "push", "-q", "origin", "main");
    git(root, "remote", "set-head", "origin", "main");
    git(root, "checkout", "-q", "-b", "feat/shop-1");
    return root;
}

/** A test layer whose Verify writes proof.json: an existing check, plus the work item's test when it is there. */
const proveScript = `#!/bin/sh
existing=true; grep -q BROKEN ../../apps/api/runs.ts && existing=false
tests="{\\"title\\": \\"health check\\", \\"acs\\": [], \\"passed\\": $existing}"
if [ -f runs.spec ]; then
  passed=false; grep -q FIXED ../../apps/api/runs.ts && passed=true; grep -q PIN runs.spec && passed=true
  tests="$tests, {\\"title\\": \\"runs are listed\\", \\"acs\\": [\\"AC-1\\"], \\"passed\\": $passed}"
fi
printf '{"tests": [%s], "thresholds": []}' "$tests" > "$EVIDENCE_DIR/proof.json"
`;

/**
 * A codebase on a work item's branch whose layers' checks are real shell scripts.
 * @param overrides files to write over or beside them before the first commit
 * @returns the codebase root
 */
export function codebaseWithChecks(overrides: Record<string, string> = {}) {
    return makeCodebase({
        "apps/api/runs.ts": "export const runs = [];\n",
        "apps/api/AGENTS.md": layerAgent("sh -c '! grep -q SYNTAXERROR runs.ts'"),
        "tests/e2e/AGENTS.md": layerAgent("sh prove.sh"),
        "tests/e2e/prove.sh": proveScript,
        ...overrides,
    });
}

/**
 * A codebase on a work item's branch with real checks and a knowledge base of one domain: the entity Run and one
 * invariant, declared under `## Knowledge base` of the root AGENTS.md.
 * @param overrides files to write over or beside them before the first commit
 * @returns the codebase root
 */
export function codebaseWithKnowledge(overrides: Record<string, string> = {}) {
    return codebaseWithChecks({
        "AGENTS.md": `${rootAgent}## Knowledge base\n\ndocs/kb\n`,
        "docs/kb/README.md": "# KB\n\n- [Runs](domains/runs/README.md): what a person runs.\n",
        "docs/kb/domains/runs/README.md": "# Runs\n\nOwner: the team.\n",
        "docs/kb/domains/runs/entities/run.md": "# Run\n\nOne execution, owned by one Workspace.\n",
        "docs/kb/domains/runs/invariants/own-runs-only.md":
            "# A person sees only the Runs of their own Workspace\n\nExample: Ana of Acme opens run 9 of Globex and is told it is not found.\n",
        ...overrides,
    });
}

export const workItems: Record<string, string> = {
    feature:
        "Runs list\n\n### Story\nI see runs.\n\n### Acceptance criteria\n1. Given runs, when I open Runs, then they are listed.",
    bug: "Runs missing\n\n### Steps to reproduce\nOpen Runs.\n\n### Expected\nRuns are listed.\n\n### Actual\nThe list is empty.",
    technical:
        "Tidy runs\n\n### Goal\n- Simpler code.\n\n### Acceptance criteria\n- Given runs, when I open Runs, then they are listed, as before.\n\n### Scope\n- apps/api",
};
