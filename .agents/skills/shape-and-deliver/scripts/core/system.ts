import { spawnSync } from "node:child_process";
import type { Stats } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants as osConstants } from "node:os";
import { dirname, join, relative } from "node:path";
import { Context, Effect, Layer, Predicate } from "effect";
import { commandTimeoutMs } from "./policy";
import { randomSuffix } from "./random-suffix";
import { FileNotFound, FileUnreadable, WriteFailed } from "./script-errors";

type ReadError = FileNotFound | FileUnreadable;

export type Outcome = { readonly exitCode: number; readonly output: string; readonly stdout: string };

/** What the scripts do to the world: read and write files, look at paths, and run programs. */
export interface SystemOps {
    readonly readText: (path: string) => Effect.Effect<string, ReadError>;
    readonly writeText: (path: string, content: string) => Effect.Effect<void, WriteFailed>;
    readonly remove: (path: string) => Effect.Effect<void, WriteFailed>;
    readonly createExclusive: (path: string, content: string) => Effect.Effect<boolean, WriteFailed>;
    readonly exists: (path: string) => Effect.Effect<boolean>;
    readonly isFolder: (path: string) => Effect.Effect<boolean>;
    readonly fileSize: (path: string) => Effect.Effect<number | undefined>;
    readonly listFiles: (folder: string) => Effect.Effect<string[]>;
    readonly processId: Effect.Effect<number>;
    readonly isRunning: (pid: number) => Effect.Effect<boolean>;
    readonly run: (
        program: string,
        args: readonly string[],
        cwd: string,
        env: Readonly<Record<string, string>>,
    ) => Effect.Effect<Outcome>;
}

/**
 * Whether a file system failure says the path does not exist.
 * @param cause what the file system threw
 * @returns true for a missing file or folder
 */
const isMissing = (cause: unknown) => Predicate.isObject(cause) && cause.code === "ENOENT";

/**
 * Whether a file system failure says there is nothing at the path: it is missing, or a part of it is not a folder.
 * @param cause what the file system threw
 * @returns true when the path holds nothing
 */
const isAbsent = (cause: unknown) => isMissing(cause) || (Predicate.isObject(cause) && cause.code === "ENOTDIR");

/**
 * What a path is, or nothing when it is absent; any other failure is a defect.
 * @param path the path
 * @returns its stats, or undefined when nothing is there
 */
const statOf = (path: string): Effect.Effect<Stats | undefined> =>
    Effect.tryPromise({ try: () => stat(path), catch: (cause) => cause }).pipe(
        Effect.catch((cause) => (isAbsent(cause) ? Effect.succeed(undefined) : Effect.die(cause))),
    );

/**
 * Words why a program that ran produced no exit code: it was killed after its time, or by a signal.
 * @param error what spawnSync reported, if anything
 * @param signal the signal that ended the program, if any
 * @param timeoutMs how long it was given
 * @returns the sentence, or undefined when the program simply exited
 */
const endedAbnormally = (error: Error | undefined, signal: NodeJS.Signals | null, timeoutMs: number) => {
    if (error !== undefined && "code" in error && error.code === "ETIMEDOUT") {
        return `killed after running longer than ${Math.round(timeoutMs / 1000)} seconds (${signal ?? "SIGTERM"})`;
    }
    return signal === null ? undefined : `killed by signal ${signal}`;
};

/**
 * Runs a program to its end, or to its timeout, and keeps what it printed and how it ended.
 * @param program the program, such as git or sh
 * @param args its arguments
 * @param where the folder it runs in, the variables added to the current environment, and how long it may run
 * @param where.cwd the folder
 * @param where.env the variables
 * @param where.timeoutMs the time it is given before it is killed
 * @returns its exit code, its standard output, and its standard output and error together
 * Writes: whatever the program does.
 * @public
 */
export const runProgram = (
    program: string,
    args: readonly string[],
    where: { readonly cwd: string; readonly env: Readonly<Record<string, string>>; readonly timeoutMs: number },
): Outcome => {
    const result = spawnSync(program, [...args], {
        cwd: where.cwd,
        env: { ...process.env, ...where.env },
        encoding: "utf8",
        maxBuffer: 1 << 28,
        timeout: where.timeoutMs,
    });
    const stdout = result.stdout ?? "";
    const note =
        endedAbnormally(result.error, result.signal, where.timeoutMs) ?? (result.error ? String(result.error) : "");
    const signalNumber = result.signal === null ? undefined : osConstants.signals[result.signal];
    return {
        exitCode: result.status ?? (signalNumber === undefined ? 127 : 128 + signalNumber),
        output: `${stdout}${result.stderr ?? ""}${note}`,
        stdout,
    };
};

const systemOps: SystemOps = {
    /** The id of this process, which a lock records so a later driver can tell whether its holder is still there. */
    processId: Effect.sync(() => process.pid),
    /**
     * Whether a process is running on this machine.
     * @param pid the process id
     * @returns true when it exists; a process of another user counts as running
     */
    isRunning: Effect.fn("System.isRunning")((pid: number) =>
        Effect.sync(() => {
            try {
                process.kill(pid, 0);
                return true;
            } catch (cause) {
                return Predicate.isObject(cause) && cause.code === "EPERM";
            }
        }),
    ),
    /**
     * The whole text of a file.
     * @param path the file
     * @returns its text
     * Fails: `FileNotFound` when missing, `FileUnreadable` for any other failure.
     */
    readText: Effect.fn("System.readText")((path: string) =>
        Effect.tryPromise({
            try: () => readFile(path, "utf8"),
            catch: (cause) => (isMissing(cause) ? new FileNotFound({ path }) : new FileUnreadable({ path, cause })),
        }),
    ),
    /**
     * Write a file, making its folder first; the text goes to a draft beside it that is renamed into place, so a reader never sees half a file.
     * @param path the file
     * @param content its text
     * @returns nothing once written
     * Writes: the file, through a `.writing` draft beside it; creates its folder.
     * Fails: `WriteFailed`.
     */
    writeText: Effect.fn("System.writeText")(function* (path: string, content: string) {
        const draft = `${path}.${yield* randomSuffix}.writing`;
        yield* Effect.tryPromise({
            try: async () => {
                await mkdir(dirname(path), { recursive: true });
                await writeFile(draft, content, "utf8");
                await rename(draft, path);
            },
            catch: (cause) => new WriteFailed({ path, cause }),
        });
    }),
    /**
     * Remove a file or a folder with everything in it; a missing path is already removed.
     * @param path the file or folder
     * @returns nothing once removed
     * Writes: removes the path.
     * Fails: `WriteFailed`.
     */
    remove: Effect.fn("System.remove")((path: string) =>
        Effect.tryPromise({
            try: () => rm(path, { recursive: true, force: true }),
            catch: (cause) => new WriteFailed({ path, cause }),
        }),
    ),
    /**
     * Create a file only if nothing is there, so of two callers at one moment exactly one creates it.
     * @param path the file
     * @param content its text
     * @returns true when this call created it, false when it was there already
     * Writes: the file, when nothing was there.
     * Fails: `WriteFailed` for any failure but the file being there already.
     */
    createExclusive: Effect.fn("System.createExclusive")((path: string, content: string) =>
        Effect.tryPromise({
            try: async () => {
                await mkdir(dirname(path), { recursive: true });
                return await writeFile(path, content, { encoding: "utf8", flag: "wx" }).then(
                    () => true,
                    (cause: unknown) => {
                        if (Predicate.isObject(cause) && cause.code === "EEXIST") {
                            return false;
                        }
                        throw cause;
                    },
                );
            },
            catch: (cause) => new WriteFailed({ path, cause }),
        }),
    ),
    /**
     * Whether anything exists at a path; a failure other than absence is a defect.
     * @param path the path
     * @returns true when it exists
     */
    exists: Effect.fn("System.exists")((path: string) => statOf(path).pipe(Effect.map((found) => found !== undefined))),
    /**
     * Whether a path is a folder; a failure other than absence is a defect.
     * @param path the path
     * @returns true when it is a folder
     */
    isFolder: Effect.fn("System.isFolder")((path: string) =>
        statOf(path).pipe(Effect.map((found) => found?.isDirectory() === true)),
    ),
    /**
     * A file's size in bytes; a failure other than absence is a defect.
     * @param path the file
     * @returns its size, or undefined when there is no such file
     */
    fileSize: Effect.fn("System.fileSize")((path: string) =>
        statOf(path).pipe(Effect.map((found) => (found?.isFile() ? found.size : undefined))),
    ),
    /**
     * Every file under a folder, as paths relative to it; a missing folder holds none, any other failure is a defect.
     * @param folder the folder
     * @returns the paths, sorted
     */
    listFiles: Effect.fn("System.listFiles")((folder: string) =>
        Effect.tryPromise({
            try: () => readdir(folder, { recursive: true, withFileTypes: true }),
            catch: (cause) => cause,
        }).pipe(
            Effect.map((entries) =>
                entries
                    .filter((entry) => entry.isFile())
                    .map((entry) => relative(folder, join(entry.parentPath, entry.name)))
                    .sort(),
            ),
            Effect.catch((cause) => (isAbsent(cause) ? Effect.succeed([]) : Effect.die(cause))),
        ),
    ),
    /**
     * Run a program and keep what it printed and its exit code; a program that could not start exits 127, and one a signal or the timeout killed exits 128 plus the signal's number, with the output saying so.
     * @param program the program, such as git or sh
     * @param args its arguments
     * @param cwd the folder it runs in
     * @param env variables added to the current environment
     * @returns its exit code, its standard output, and its standard output and error together
     * Writes: whatever the program does.
     */
    run: Effect.fn("System.run")(
        (program: string, args: readonly string[], cwd: string, env: Readonly<Record<string, string>>) =>
            Effect.sync(() => runProgram(program, args, { cwd, env, timeoutMs: commandTimeoutMs })),
    ),
};

/** The service every script reads and writes the world through. */
export class System extends Context.Service<System, SystemOps>()("continuum/shape-and-deliver/core/System") {
    static readonly layer = Layer.succeed(System, systemOps);
}
