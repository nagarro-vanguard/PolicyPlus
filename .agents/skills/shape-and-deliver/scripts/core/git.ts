import { Context, Effect, Layer } from "effect";
import { GitFailed, NotAGitWorkTree } from "./script-errors";
import { System, type Outcome } from "./system";

/** How git is run: in a folder, with its arguments, giving its exit code and what it printed. */
export type GitRun = (root: string, args: readonly string[]) => Effect.Effect<Outcome>;

/**
 * Splits the output of a git command run with `-z`, whose paths are unquoted and end in NUL.
 * @param listing git's output
 * @returns the paths
 */
const nulSeparated = (listing: string) => listing.split("\0").filter((path) => path.length > 0);

/**
 * Words what git said when it failed.
 * @param outcome how git ended
 * @returns what it printed, or its exit code when it printed nothing
 */
const saidBy = (outcome: Outcome) => outcome.output.trim() || `exit ${outcome.exitCode}`;

/**
 * Builds the commands that answer in text or by their exit code.
 * @param exec how git is run
 * @returns the commands
 */
const answersOver = (exec: GitRun) => {
    const run = Effect.fn("Git.run")(function* (root: string, args: readonly string[]) {
        const outcome = yield* exec(root, args);
        if (outcome.exitCode !== 0) {
            return yield* new GitFailed({ root, said: saidBy(outcome) });
        }
        return outcome.stdout;
    });
    const saysYes = Effect.fn("Git.saysYes")(function* (root: string, args: readonly string[]) {
        const outcome = yield* exec(root, args);
        if (outcome.exitCode > 1) {
            return yield* new GitFailed({ root, said: saidBy(outcome) });
        }
        return outcome.exitCode === 0;
    });
    const textAt = Effect.fn("Git.textAt")(function* (root: string, commit: string, path: string) {
        const shown = yield* exec(root, ["show", `${commit}:${path}`]);
        return shown.exitCode === 0 ? shown.stdout : undefined;
    });
    return { run, saysYes, textAt };
};

/** The commands that print in text, and the commands that say yes or no, on one way to run git. */
type Answers = ReturnType<typeof answersOver>;

/**
 * Builds the commands that name the repository's state: its commit, its branch and whether a path is ignored.
 * @param answers the commands that answer
 * @param answers.run the command that prints
 * @param answers.saysYes the command that says yes or no
 * @returns the commands
 */
const statesOver = ({ run, saysYes }: Answers) => {
    const headCommit = Effect.fn("Git.headCommit")(function* (root: string) {
        return (yield* run(root, ["rev-parse", "HEAD"]).pipe(
            Effect.mapError(() => new NotAGitWorkTree({ folder: root })),
        )).trim();
    });
    const currentBranch = Effect.fn("Git.currentBranch")(function* (root: string) {
        return (yield* run(root, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
    });
    const isIgnored = (root: string, path: string) => saysYes(root, ["check-ignore", "-q", path]);
    return { headCommit, currentBranch, isIgnored };
};

/**
 * Builds the commands that list paths, each read with `-z` so a path is never quoted.
 * @param run the command that prints
 * @returns the commands
 */
const listingsOver = (run: Answers["run"]) => {
    const uncommittedFiles = Effect.fn("Git.uncommittedFiles")(function* (root: string) {
        const listing = yield* run(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
        const paths: string[] = [];
        let skipOldName = false;
        for (const entry of listing.split("\0")) {
            if (skipOldName) {
                skipOldName = false;
            } else if (entry.length > 3) {
                paths.push(entry.slice(3));
                skipOldName = ["R", "C"].some((kind) => entry.slice(0, 2).includes(kind));
            }
        }
        return paths;
    });
    const changedFilesSince = Effect.fn("Git.changedFilesSince")(function* (root: string, since: string) {
        return nulSeparated(yield* run(root, ["diff", "--name-only", "-z", since, "HEAD"]));
    });
    const trackedFiles = Effect.fn("Git.trackedFiles")(function* (root: string, folder: string) {
        return nulSeparated(yield* run(root, ["ls-files", "-z", "--", folder]));
    });
    return { uncommittedFiles, changedFilesSince, trackedFiles };
};

/**
 * Builds what the scripts ask of git on top of one way to run it, so the only place that spells a git command is here.
 * @param exec how git is run
 * @returns the operations
 */
const gitOver = (exec: GitRun) => {
    const answers = answersOver(exec);
    return { ...answers, ...statesOver(answers), ...listingsOver(answers.run) };
};

/** What the scripts ask of git. */
export type GitOps = ReturnType<typeof gitOver>;

/** The service the scripts run git through: the real git over `System`, or a scripted one in a test. */
export class Git extends Context.Service<Git, GitOps>()("continuum/shape-and-deliver/core/Git") {
    /** The real git, run through `System`. */
    static readonly layer = Layer.effect(
        Git,
        Effect.gen(function* () {
            const system = yield* System;
            return gitOver((root, args) => system.run("git", ["-C", root, ...args], root, {}));
        }),
    );

    /**
     * A git that answers as a script says, so a test needs no repository.
     * @param exec how each git command ends
     * @returns the layer
     */
    static readonly testLayer = (exec: GitRun) => Layer.succeed(Git, gitOver(exec));
}

/**
 * Runs git in the codebase.
 * @param root the codebase root
 * @param args git's arguments
 * @returns git's standard output
 * Fails: GitFailed, carrying what git said, when it exits non-zero.
 */
export const git = Effect.fn("Git.git")(function* (root: string, args: readonly string[]) {
    return yield* (yield* Git).run(root, args);
});

/**
 * Runs a git command that answers by its exit code, such as check-ignore: 0 is yes and 1 is no.
 * @param root the codebase root
 * @param args git's arguments
 * @returns true when git exits 0, false when it exits 1
 * Fails: GitFailed on any higher exit code, which is a fatal error.
 */
export const gitSaysYes = Effect.fn("Git.gitSaysYes")(function* (root: string, args: readonly string[]) {
    return yield* (yield* Git).saysYes(root, args);
});

/**
 * Reads the commit the codebase has checked out.
 * @param root the codebase root
 * @returns the commit hash
 * Fails: NotAGitWorkTree when git cannot name a commit there.
 */
export const headCommit = Effect.fn("Git.headCommit")(function* (root: string) {
    return yield* (yield* Git).headCommit(root);
});

/**
 * The branch the codebase has checked out.
 * @param root the codebase root
 * @returns the branch name, or "HEAD" when no branch is checked out
 * Fails: GitFailed.
 */
export const currentBranch = Effect.fn("Git.currentBranch")(function* (root: string) {
    return yield* (yield* Git).currentBranch(root);
});

/**
 * Whether git ignores a path in the codebase.
 * @param root the codebase root
 * @param path the path, relative to the root
 * @returns true when git ignores it
 * Fails: GitFailed on a fatal git error.
 */
export const isIgnored = Effect.fn("Git.isIgnored")(function* (root: string, path: string) {
    return yield* (yield* Git).isIgnored(root, path);
});

/**
 * Lists the files with uncommitted changes, tracked or untracked, leaving out ignored files. A renamed or copied file
 * is listed under its new path only.
 * @param root the codebase root
 * @returns the paths, relative to the root, unquoted
 * Fails: GitFailed.
 */
export const uncommittedFiles = Effect.fn("Git.uncommittedFiles")(function* (root: string) {
    return yield* (yield* Git).uncommittedFiles(root);
});

/**
 * Lists every file that differs between a commit and the current one.
 * @param root the codebase root
 * @param since the earlier commit
 * @returns the paths, relative to the root, unquoted
 * Fails: GitFailed.
 */
export const changedFilesSince = Effect.fn("Git.changedFilesSince")(function* (root: string, since: string) {
    return yield* (yield* Git).changedFilesSince(root, since);
});

/**
 * Lists the files git tracks under a folder.
 * @param root the codebase root
 * @param folder the folder, relative to the root
 * @returns the paths, relative to the root, unquoted
 * Fails: GitFailed.
 */
export const trackedFiles = Effect.fn("Git.trackedFiles")(function* (root: string, folder: string) {
    return yield* (yield* Git).trackedFiles(root, folder);
});

/**
 * Reads a file as a commit holds it.
 * @param root the codebase root
 * @param commit the commit to read from
 * @param path the file, relative to the root
 * @returns the file's text, or undefined when the commit does not hold it
 */
export const textAt = Effect.fn("Git.textAt")(function* (root: string, commit: string, path: string) {
    return yield* (yield* Git).textAt(root, commit, path);
});
