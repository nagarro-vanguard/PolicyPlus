import { appendFile, chmod, lstat, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Context, Effect, Layer, Predicate } from "effect";
import { FileNotFound, FileUnreadable, WriteFailed } from "../run/script-errors";

type ReadError = FileNotFound | FileUnreadable;

export interface FileAccessOps {
    readonly readBytes: (path: string) => Effect.Effect<Uint8Array, ReadError>;
    readonly readText: (path: string) => Effect.Effect<string, ReadError>;
    readonly writeText: (path: string, content: string) => Effect.Effect<void, WriteFailed>;
    readonly writeExecutable: (path: string, content: string) => Effect.Effect<void, WriteFailed>;
    readonly createExclusive: (path: string, content: string) => Effect.Effect<boolean, WriteFailed>;
    readonly appendText: (path: string, content: string) => Effect.Effect<void, WriteFailed>;
    readonly exists: (path: string) => Effect.Effect<boolean, FileUnreadable>;
    readonly isDirectory: (path: string) => Effect.Effect<boolean, FileUnreadable>;
    readonly isLink: (path: string) => Effect.Effect<boolean, FileUnreadable>;
    readonly entriesOf: (dir: string) => Effect.Effect<string[], ReadError>;
    readonly move: (from: string, to: string) => Effect.Effect<void, WriteFailed>;
    readonly remove: (path: string) => Effect.Effect<void, WriteFailed>;
}

/**
 * The code a system failure carries, such as `ENOENT`.
 * @param cause any failure
 * @returns its code, or undefined when it carries none
 */
const errorCode = (cause: unknown) => (Predicate.isObject(cause) ? cause.code : undefined);

/**
 * Whether a file system failure says the path does not exist.
 * @param cause what the file system threw
 * @returns true for a missing file or folder
 */
const isMissing = (cause: unknown) => errorCode(cause) === "ENOENT";

/**
 * Run a read of `path` as an Effect.
 * @param path the file or folder read, named in the error
 * @param run the read
 * @returns what the read gives, or FileNotFound when the path is missing and FileUnreadable for any other failure
 */
const reading = <A>(path: string, run: () => Promise<A>): Effect.Effect<A, ReadError> =>
    Effect.tryPromise({
        try: run,
        catch: (cause) => (isMissing(cause) ? new FileNotFound({ path }) : new FileUnreadable({ path, cause })),
    });

/**
 * Run a write to `path` as an Effect.
 * @param path the file or folder written, named in the error
 * @param run the write
 * @returns nothing once written, or WriteFailed
 */
const writing = (path: string, run: () => Promise<unknown>): Effect.Effect<void, WriteFailed> =>
    Effect.tryPromise({ try: run, catch: (cause) => new WriteFailed({ path, cause }) }).pipe(Effect.asVoid);

/**
 * Write `content` to a copy beside `path`, then rename it into place, so a crash never leaves half a file.
 * @param path the file, whose folder is created when missing
 * @param content the file's new text
 * @returns nothing once the file is in place
 */
async function replaceFile(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const draft = `${path}.${process.pid}.writing`;
    await writeFile(draft, content);
    await rename(draft, path);
}

/**
 * Whether a file system failure says the path is not there: it does not exist, or a part of it is a file.
 * @param cause what the file system threw
 * @returns true for a path that is not there
 */
const isAbsent = (cause: unknown) => isMissing(cause) || errorCode(cause) === "ENOTDIR";

/**
 * The file system's facts about a path.
 * @param path the path
 * @param look how to read them: `stat` follows a link, `lstat` does not
 * @returns its stats, undefined when the path is not there, or FileUnreadable when the facts cannot be read, such as
 *  in a folder the user may not open
 */
const statOf = (path: string, look: typeof stat = stat) =>
    Effect.tryPromise({
        try: () =>
            look(path).then(
                (stats) => stats,
                (cause: unknown) => {
                    if (isAbsent(cause)) {
                        return undefined;
                    }
                    throw cause;
                },
            ),
        catch: (cause) => new FileUnreadable({ path, cause }),
    });

const sourceTreeOps: FileAccessOps = {
    /**
     * A file's bytes from the real file system. Scripts read and write the source and the analysis only through this
     * service.
     * @param path the file
     * @returns its bytes
     */
    readBytes: (path) => reading(path, () => readFile(path)),
    readText: (path) => reading(path, () => readFile(path, "utf8")),
    /**
     * Replace a file's content, creating its folder.
     * @param path the file
     * @param content the new text
     * @returns nothing once the file is in place
     */
    writeText: (path, content) => writing(path, () => replaceFile(path, content)),
    /**
     * Write a file a shell runs by its path: the text, then the mode that lets its owner and everyone run it.
     * @param path the file, whose folder is created when missing
     * @param content the file's text, opening with the line naming what runs it
     * @returns the effect that writes it
     */
    writeExecutable: (path, content) =>
        writing(path, async () => {
            await replaceFile(path, content);
            await chmod(path, 0o755);
        }),
    /**
     * Create a file only when none is there, in one step of the file system, so of two callers at the same moment one
     * creates it and the other learns it lost (D75).
     * @param path the file, whose folder is created when missing
     * @param content the file's text
     * @returns true when this call created it; false when the file was there already
     */
    createExclusive: (path, content) =>
        Effect.tryPromise({
            try: async () => {
                await mkdir(dirname(path), { recursive: true });
                return writeFile(path, content, { flag: "wx" }).then(
                    () => true,
                    (cause: unknown) => {
                        if (errorCode(cause) === "EEXIST") {
                            return false;
                        }
                        throw cause;
                    },
                );
            },
            catch: (cause) => new WriteFailed({ path, cause }),
        }),
    appendText: (path, content) =>
        writing(path, async () => {
            await mkdir(dirname(path), { recursive: true });
            await appendFile(path, content);
        }),
    exists: (path) => statOf(path).pipe(Effect.map(Boolean)),
    isDirectory: (path) =>
        statOf(path).pipe(Effect.map((stats) => (stats === undefined ? false : stats.isDirectory()))),
    /**
     * Whether the path is itself a symbolic link.
     * @param path the path
     * @returns true for a link; false when it is not one or does not exist
     */
    isLink: (path) =>
        statOf(path, lstat).pipe(Effect.map((stats) => (stats === undefined ? false : stats.isSymbolicLink()))),
    /**
     * Every file under a folder, skipping `.git`. The paths are sorted, so no result depends on the order a disk lists
     * a folder in.
     * @param dir the folder
     * @returns the sorted paths, relative to `dir`
     */
    entriesOf: (dir) => reading(dir, () => readdir(dir).then((names) => names.sort())),
    move: (from, to) =>
        writing(to, async () => {
            await mkdir(dirname(to), { recursive: true });
            await rename(from, to);
        }),
    remove: (path) => writing(path, () => rm(path, { recursive: true, force: true })),
};

export class FileAccess extends Context.Service<FileAccess, FileAccessOps>()("code-analysis/core/FileAccess") {
    static readonly layer: Layer.Layer<FileAccess> = Layer.succeed(FileAccess, FileAccess.of(sourceTreeOps));
}
