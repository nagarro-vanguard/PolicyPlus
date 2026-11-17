import { spawnSync } from "node:child_process";
import { Context, Effect, Layer } from "effect";
import { GitFailed } from "../run/script-errors";

export interface GitRepositoryOps {
    readonly isRepository: (root: string) => Effect.Effect<boolean>;
    readonly trackedFiles: (root: string) => Effect.Effect<string[], GitFailed>;
    readonly headOf: (root: string) => Effect.Effect<{ readonly commit: string; readonly clean: boolean }, GitFailed>;
}

/**
 * Run git in a repository and read what it prints, a failure or a non-zero exit being an error (P1.9).
 * @param root a folder inside the repository
 * @param args git's arguments
 * @returns what git printed
 */
const gitSays = (root: string, args: readonly string[]) =>
    Effect.suspend(() => {
        const ran = spawnSync("git", ["-C", root, ...args], { maxBuffer: 1 << 30 });
        if (ran.error) {
            return Effect.fail(new GitFailed({ root, cause: ran.error }));
        }
        if (ran.status !== 0) {
            return Effect.fail(
                new GitFailed({ root, cause: `exit ${ran.status}: ${ran.stderr.toString("utf8").trim()}` }),
            );
        }
        return Effect.succeed(ran.stdout.toString("utf8"));
    });

const gitRepositoryOps: GitRepositoryOps = {
    /**
     * Whether a folder is inside a git repository's working tree, asked of git itself; a machine without git, or any
     * failure, says no, and the root is then listed by walking its folders (D184).
     * @param root the folder
     * @returns true inside a working tree
     */
    isRepository: (root) =>
        Effect.sync(() => {
            const ran = spawnSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], { encoding: "utf8" });
            return ran.status === 0 && ran.stdout.trim() === "true";
        }),
    /**
     * The files git tracks under `root`, those of checked-out submodules included, by running git as a process. What
     * the repository tracks is the code: a file its `.gitignore` files leave out was never committed, and a file
     * committed although a rule matches it is source by the team's own act. A submodule not checked out is listed as
     * its folder. A root outside a repository, a machine without git, or any other failure of git is GitFailed.
     * @param root the folder to list, inside a git repository
     * @returns the tracked files, relative to the root
     */
    trackedFiles: (root) =>
        Effect.suspend(() => {
            const listing = spawnSync("git", ["-C", root, "ls-files", "-z", "--recurse-submodules"], {
                maxBuffer: 1 << 30,
            });
            if (listing.error) {
                return Effect.fail(new GitFailed({ root, cause: listing.error }));
            }
            if (listing.status !== 0) {
                const said = listing.stderr.toString("utf8").trim();
                return Effect.fail(new GitFailed({ root, cause: `exit ${listing.status}: ${said}` }));
            }
            return Effect.succeed(listing.stdout.toString("utf8").split("\0").filter(Boolean));
        }),
    headOf: (root) =>
        Effect.gen(function* () {
            const commit = (yield* gitSays(root, ["rev-parse", "HEAD"])).trim();
            const changes = yield* gitSays(root, ["status", "--porcelain"]);
            return { commit, clean: changes.trim().length === 0 };
        }),
};

export class GitRepository extends Context.Service<GitRepository, GitRepositoryOps>()(
    "code-analysis/core/GitRepository",
) {
    static readonly layer: Layer.Layer<GitRepository> = Layer.succeed(
        GitRepository,
        GitRepository.of(gitRepositoryOps),
    );
}
