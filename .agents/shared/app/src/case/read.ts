import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { caseContractVersion, caseFiles, Manifest } from "../../compose/contract";

// The case folder as the app reads it: the manifest first, then only the files it lists. The app refuses a case of
// another contract version and a file whose digest or size differs from the
// manifest (it was changed or cut after compose wrote it). Each file is checked against its schema in compose's contract
// when it is read, so the app and compose cannot read one file two ways.

export type ListedFile = { path: string; schema: string; sha256: string; bytes: number };

export type Case = {
    readonly dir: string;
    /** The manifest's list of files, by path. */
    readonly files: ReadonlyMap<string, ListedFile>;
    /** Whether the case holds a file. */
    readonly has: (path: string) => boolean;
    /** A file's value, checked against its schema in the contract; read once. */
    readonly json: (path: string) => unknown;
};

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/**
 * Open a case folder: check its manifest, its version, and every listed file's size and digest.
 * @param dir the case folder
 * @returns the case
 */
export const openCase = (dir: string): Case => {
    const manifestPath = join(dir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error(`${dir} holds no manifest.json: it is not a case folder`);
    const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        contractVersion?: unknown;
        files?: unknown;
    };
    if (raw.contractVersion !== caseContractVersion) {
        throw new Error(
            `${dir} is a case of contract version ${String(raw.contractVersion)}; this app reads version ${caseContractVersion}: compose the case again with the app's own compose`,
        );
    }
    const manifest = Manifest.parse(raw);
    const files = new Map(manifest.files.map((file) => [file.path, file]));
    for (const file of manifest.files) {
        const full = join(dir, file.path);
        if (!existsSync(full)) throw new Error(`${file.path} is listed in the case's manifest but missing`);
        const bytes = readFileSync(full);
        if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
            throw new Error(`${file.path} differs from the case's manifest: it was changed after compose wrote it`);
        }
    }
    const read = new Map<string, unknown>();
    return {
        dir,
        files,
        has: (path) => files.has(path),
        json: (path) => {
            if (read.has(path)) return read.get(path);
            if (!files.has(path)) throw new Error(`the case holds no ${path}`);
            const schema = caseFiles[path] as z.ZodType | undefined;
            const value: unknown = JSON.parse(readFileSync(join(dir, path), "utf8"));
            const parsed = schema === undefined ? value : schema.safeParse(value);
            if (schema !== undefined) {
                const result = parsed as ReturnType<z.ZodType["safeParse"]>;
                if (!result.success) {
                    const issues = result.error.issues
                        .slice(0, 5)
                        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
                        .join("; ");
                    throw new Error(`${path} does not match the case contract: ${issues}`);
                }
                read.set(path, result.data);
                return result.data;
            }
            read.set(path, value);
            return value;
        },
    };
};
