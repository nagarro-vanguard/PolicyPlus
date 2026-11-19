import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { z } from "zod";
import { ComposeError } from "./errors";

/** Compare two texts by code unit, the same on every machine and locale. */
export const compareText = (one: string, other: string) => (one < other ? -1 : one > other ? 1 : 0);

/** The SHA-1 of a text, as the analysis writes its payload digests. */
export const sha1 = (text: string) => createHash("sha1").update(text).digest("hex");

/** The SHA-256 of a text. */
export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/**
 * Read a file as text, failing with the file's name when it cannot be read.
 * @param path the file
 * @returns its text
 */
export const readText = (path: string) => {
    try {
        return readFileSync(path, "utf8");
    } catch {
        throw new ComposeError("input", `cannot read ${path}`);
    }
};

/**
 * Read a JSON file and check it against a schema; a file that does not parse or does not match fails with the first
 * problems and where they are.
 * @param path the file
 * @param schema what it must hold
 * @param text the file's text when already read
 * @returns the value
 */
export const readJson = <T extends z.ZodType>(path: string, schema: T, text?: string): z.output<T> => {
    let value: unknown;
    try {
        value = JSON.parse(text ?? readText(path));
    } catch (error) {
        if (error instanceof ComposeError) throw error;
        throw new ComposeError("input", `${path} is not JSON`);
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .slice(0, 5)
            .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("; ");
        throw new ComposeError("missing", `${path} does not hold the facts compose needs: ${issues}`);
    }
    return parsed.data;
};

/**
 * JSON with every object's keys sorted, so the same value always gives the same text.
 * @param value the value
 * @returns the text, with a final newline
 */
export const stableJson = (value: unknown) => `${JSON.stringify(sortKeys(value))}\n`;

const sortKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, each]) => each !== undefined)
            .sort(([one], [other]) => compareText(one, other));
        return Object.fromEntries(entries.map(([key, each]) => [key, sortKeys(each)]));
    }
    return value;
};

/**
 * Write a folder of files from scratch: what was in it is removed first, so nothing of an earlier run is left.
 * @param folder the folder
 * @param files each file's path in the folder and its text
 */
export const writeFolder = (folder: string, files: ReadonlyMap<string, string>) => {
    if (existsSync(folder)) rmSync(folder, { recursive: true, force: true });
    mkdirSync(folder, { recursive: true });
    for (const [path, text] of [...files].sort(([one], [other]) => compareText(one, other))) {
        const full = join(folder, path);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, text);
    }
};

/**
 * The names in a folder, sorted; none when the folder does not exist.
 * @param folder the folder
 * @returns the names
 */
export const namesIn = (folder: string) =>
    existsSync(folder) ? readdirSync(folder).sort(compareText) : ([] as string[]);

/** Group items by a key, keeping their order. */
export const groupBy = <T>(items: readonly T[], keyOf: (item: T) => string) => {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = keyOf(item);
        const group = groups.get(key);
        if (group === undefined) groups.set(key, [item]);
        else group.push(item);
    }
    return groups;
};

/** Distinct values, sorted as text. */
export const distinct = (items: Iterable<string>) => [...new Set(items)].sort(compareText);

/** Count items by a key, the result sorted by key. */
export const countBy = <T>(items: readonly T[], keyOf: (item: T) => string) => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
    return new Map([...counts].sort(([one], [other]) => compareText(one, other)));
};
