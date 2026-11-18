import { dirname, join } from "node:path";
import { Effect } from "effect";
import { isPlainName } from "./contained-path";
import { matchesAny } from "./glob";
import { readCodebase } from "./codebase";
import { git, uncommittedFiles } from "./git";
import { RequestInvalid } from "./script-errors";
import { runLayout, stageFolderOf } from "./run-layout";
import { rememberProfile } from "./story";
import { System } from "./system";

/** What a pick needs: the story, the variant, where it goes, and the commands to run after (the screens layer's when absent). */
export type PickInput = {
    readonly codebase: string;
    readonly story: string;
    readonly variant: string;
    readonly to: string;
    readonly commands?: readonly string[];
};

/**
 * Finds the first reason to refuse a pick: uncommitted files, a variant that is not there, a place the screens layer
 * does not allow, or a place already taken.
 * @param input what a pick needs
 * @param root the story's variants root
 * @param pickedTo the globs a variant may be moved to
 * @returns the first reason, or undefined when the pick may go on
 * Fails: GitFailed.
 */
const refusalOf = Effect.fnUntraced(function* (input: PickInput, root: string, pickedTo: readonly string[]) {
    const system = yield* System;
    if ((yield* uncommittedFiles(input.codebase)).length > 0) {
        return "the work tree has uncommitted files; commit or stash them, so the pick is one clean commit";
    }
    if (!(yield* system.isFolder(join(input.codebase, root, input.variant)))) {
        return `${join(root, input.variant)} is no variant of story ${input.story}`;
    }
    if (input.to.split("/").includes("..") || !matchesAny(input.to, pickedTo)) {
        return `${input.to} is not a place a picked variant may go; it goes under ${pickedTo.join(", ")}`;
    }
    const taken =
        input.to === root || input.to.startsWith(`${root}/`) || (yield* system.exists(join(input.codebase, input.to)));
    return taken ? `${input.to} is inside the variants or already exists; name a new place` : undefined;
});

/**
 * Removes the folders that removing files left empty, from each file's folder up to the codebase root, so a failed pick
 * leaves no empty folder at the place it was going to.
 * @param codebase the codebase root
 * @param files the removed files, relative to the root
 * @returns nothing once removed
 * Writes: removes empty folders.
 * Fails: WriteFailed.
 */
const removeEmptyParents = Effect.fnUntraced(function* (codebase: string, files: readonly string[]) {
    const system = yield* System;
    for (const file of files) {
        for (let folder = dirname(file); folder !== "." && folder !== "/"; folder = dirname(folder)) {
            const path = join(codebase, folder);
            if (!(yield* system.isFolder(path)) || (yield* system.listFiles(path)).length > 0) {
                break;
            }
            yield* system.remove(path);
        }
    }
});

/**
 * Puts back what a pick changed. A pick starts on a clean tree, so every file that differs from the commit it started
 * from is the pick's: the index is set back to that commit, tracked files are restored from it, and the untracked
 * files the pick made are cleaned, each by its own path. Nothing is reset or cleaned by a blanket command.
 * @param codebase the codebase root
 * @returns nothing once restored
 * Writes: the work tree and the index; git reset, restore and clean, on the paths that differ.
 * Fails: GitFailed.
 */
const restoreTree = Effect.fnUntraced(function* (codebase: string) {
    yield* git(codebase, ["reset", "-q"]);
    const touched = yield* uncommittedFiles(codebase);
    if (touched.length === 0) {
        return;
    }
    const known = new Set(
        (yield* git(codebase, ["ls-tree", "-r", "-z", "--name-only", "HEAD", "--", ...touched])).split("\0"),
    );
    const tracked = touched.filter((path) => known.has(path));
    const made = touched.filter((path) => !known.has(path));
    if (tracked.length > 0) {
        yield* git(codebase, ["restore", "-q", "--source=HEAD", "--worktree", "--", ...tracked]);
    }
    if (made.length > 0) {
        yield* git(codebase, ["clean", "-q", "-f", "-d", "--", ...made]);
        yield* removeEmptyParents(codebase, made);
    }
});

/**
 * Moves the chosen variant to its place, deletes the variants root, runs the after-pick commands and commits once.
 * @param input what a pick needs
 * @param root the story's variants root
 * @param afterPick the screens layer's after-pick commands, used when the input gives none
 * @returns nothing once committed
 * Writes: the work tree; git mv, rm, add and commit; removes the variants root and its empty parent.
 * Fails: RequestInvalid for a failed command, GitFailed, WriteFailed.
 */
const promote = Effect.fnUntraced(function* (input: PickInput, root: string, afterPick: readonly string[]) {
    const system = yield* System;
    const made = yield* system.run("mkdir", ["-p", dirname(join(input.codebase, input.to))], input.codebase, {});
    if (made.exitCode !== 0) {
        return yield* new RequestInvalid({
            issue: `could not make the folder for ${input.to}: ${made.output.trim()}`,
        });
    }
    yield* git(input.codebase, ["mv", join(root, input.variant), input.to]);
    yield* git(input.codebase, ["rm", "-r", "-q", "-f", "--ignore-unmatch", root]);
    yield* system.remove(join(input.codebase, root));
    const parent = join(input.codebase, dirname(root));
    if ((yield* system.exists(parent)) && (yield* system.listFiles(parent)).length === 0) {
        yield* system.remove(parent);
    }
    for (const command of input.commands ?? afterPick) {
        const outcome = yield* system.run("sh", ["-c", command], input.codebase, {});
        if (outcome.exitCode !== 0) {
            return yield* new RequestInvalid({
                issue: `\`${command}\` failed after the pick, so nothing is committed and the tree is restored; fix it and run the pick again: ${outcome.output.trim()}`,
            });
        }
    }
    yield* git(input.codebase, ["add", "-A"]);
    yield* git(input.codebase, [
        "commit",
        "-q",
        "-m",
        `refactor: promote the picked design of story ${input.story}\n\nRefs: ${input.story}`,
    ]);
});

/**
 * Moves the chosen variant to its real place, deletes the other variants and the comparison page, runs the screens
 * layer's after-pick commands through `sh -c`, and commits the result once. If any of that fails the tree is
 * restored to where the pick started, so it can be run again. Once committed it clears the design's build progress and
 * marks the run as picked.
 * @param input what a pick needs
 * @returns the new commit's hash
 * Writes: the work tree; git mv, rm, add and commit (and reset, restore and clean on failure); removes the variants folder,
 * the tests-first, code and change-review stage folders and the build folder; writes the run's profile state
 * `{kind, picked}`.
 * Fails: RequestInvalid for a refusal or a failed after-pick command, GitFailed, WriteFailed, CodebaseContractBroken.
 */
export const pickVariant = Effect.fn("Pick.pickVariant")(function* (input: PickInput) {
    const system = yield* System;
    for (const [what, name] of [
        ["story", input.story],
        ["variant", input.variant],
    ] as const) {
        if (!isPlainName(name)) {
            return yield* new RequestInvalid({ issue: `${name} is not a ${what} name; it must hold no / or ..` });
        }
    }
    const { screens } = yield* readCodebase(input.codebase);
    const root = (screens?.variants ?? "").replaceAll("{story}", input.story);
    const refusal =
        screens === undefined
            ? "no layer lists ## Design variants, so there are no variants to pick from"
            : yield* refusalOf(input, root, screens.pickedTo);
    if (refusal !== undefined) {
        return yield* new RequestInvalid({ issue: refusal });
    }
    const change = promote(input, root, screens?.afterPick ?? []);
    yield* change.pipe(
        Effect.tapError(() =>
            restoreTree(input.codebase).pipe(
                Effect.catch(
                    (restoreFailure) =>
                        new RequestInvalid({
                            issue: `the pick failed, and then restoring the tree failed too (${restoreFailure.message}); check git status and put the tree back by hand before picking again`,
                        }),
                ),
            ),
        ),
    );
    const layout = runLayout(input.codebase, input.story);
    for (const stage of ["tests-first", "code", "change-review"] as const) {
        yield* system.remove(join(layout.root, stageFolderOf(stage)));
    }
    yield* system.remove(join(layout.work, "build"));
    yield* rememberProfile(layout, { kind: "feature", picked: input.variant });
    return (yield* git(input.codebase, ["rev-parse", "HEAD"])).trim();
});
