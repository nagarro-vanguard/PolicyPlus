import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { Schema } from "effect";
import { about, Text } from "./fields";

export const ModernizationRequest = Schema.Struct({
    outputRoot: Text.annotate(about("The folder every output is kept in, as an absolute path.")),
    sourceRoots: Schema.NonEmptyArray(Text).annotate(about("Every folder of legacy code, as absolute paths.")),
    leaveOut: Schema.Array(
        Schema.Struct({
            pattern: Text.annotate(about("Files left out, in .gitignore syntax.")),
            reason: Text.annotate(about("Why, in the person's words.")),
        }),
    ).annotate(about("What the person decided is not part of the product.")),
    target: Text.annotate(about("The folder the new codebase is made in, as an absolute path.")),
    stack: Schema.NonEmptyArray(Text).annotate(
        about("The target technology, one line each, in the person's words; numbered from 1 by their order."),
    ),
    documents: Schema.Array(
        Schema.Struct({
            path: Text.annotate(about("A file outside the code, as an absolute path.")),
            whatItIs: Text.annotate(about("What it is, in the person's words.")),
        }),
    ).annotate(about("Documents that say what the product should be: an RFP, requirements, notes.")),
    notes: Schema.Array(Text).annotate(about("Anything else the person wants honoured, one statement each.")),
    goals: Schema.optionalKey(
        Text.annotate(
            about(
                "Why this modernization and what the target stack must achieve, written by the person and kept word for word; absent when not given. Shown to readers as written; no agent writes or rewrites it.",
            ),
        ),
    ),
}).annotate(about("The modernization's settings, read from the person's request."));

export type ModernizationRequest = typeof ModernizationRequest.Type;

export const requestHelp = [
    "The request is markdown with one `## <Section>` per setting; HTML comments and unknown sections are ignored.",
    "`## Output Root` and `## Target Codebase`: one folder each; the target may not exist yet.",
    "`## Source Roots`, one `- <folder>` per line (required).",
    "`## Leave Out`, one `- <pattern>: <reason>` per line, or `None`.",
    "`## Target Stack`, one `- <line>` per line: required, never empty.",
    "`## Documents`, one `- <path>: <what it is>` per line, or `None`.",
    "`## Additional Notes`, one `- <statement>` per line, or `None`.",
    "`## Goals` (optional): why this modernization and what the target stack must achieve, in your own words; kept as written. Leave it out, empty or `None` when there are none.",
    "Relative paths are read from the request's folder.",
].join(" ");

export class RequestInvalid extends Error {
    constructor(readonly problems: readonly string[]) {
        super(`Invalid modernization request: ${problems.join("; ")}.`);
    }
}

const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?(-->|$)/g, "");

const sectionsOf = (text: string) => {
    const bodies = new Map<string, string[]>();
    let current: string[] | undefined;
    for (const line of text.split("\n")) {
        if (line.startsWith("## ")) {
            current = [];
            bodies.set(line.slice(3).trim(), current);
        } else if (current !== undefined) {
            current.push(line);
        }
    }
    return bodies;
};

const itemsOf = (lines: readonly string[] = []) =>
    lines
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim())
        .filter((item) => item.length > 0);

const firstLine = (lines: readonly string[] = []) => {
    const first = lines.map((line) => line.trim()).find((line) => line.length > 0);
    return first === undefined ? undefined : first.startsWith("- ") ? first.slice(2).trim() : first;
};

const isNone = (items: readonly string[]) => items.length === 1 && items[0]?.toLowerCase() === "none";

/** A free-text section as written, without its surrounding blank lines; undefined when empty or `None`. */
const proseOf = (lines: readonly string[] = []) => {
    const text = lines
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();
    return text === "" || text.toLowerCase() === "none" ? undefined : text;
};

/** `- <left>: <right>` split at the first colon that is followed by a space, so a Windows path keeps its colon. */
const splitPair = (item: string): [string, string] | undefined => {
    const at = item.search(/: /);
    return at < 1 ? undefined : [item.slice(0, at).trim(), item.slice(at + 2).trim()];
};

/**
 * Reads a modernization request. A missing or empty Target Stack, a missing root and a malformed line are all reported
 * together, so the person fixes the request once.
 * @param text the request's text
 * @param baseDir the folder relative paths are read from
 * @returns the request
 * Fails: RequestInvalid naming every rule the request breaks.
 */
export const parseRequest = (text: string, baseDir: string): ModernizationRequest => {
    const sections = sectionsOf(withoutComments(text));
    const problems: string[] = [];
    const abs = (path: string) => (isAbsolute(path) ? path : resolve(baseDir, path));
    const need = (name: string) => {
        const lines = sections.get(name);
        if (lines === undefined) problems.push(`no \`## ${name}\` section`);
        return lines;
    };
    const outputRoot = firstLine(need("Output Root"));
    if (outputRoot === undefined && sections.has("Output Root")) problems.push("`## Output Root` is empty");
    const target = firstLine(need("Target Codebase"));
    if (target === undefined && sections.has("Target Codebase")) problems.push("`## Target Codebase` is empty");
    const sourceRoots = itemsOf(need("Source Roots")).map(abs);
    if (sourceRoots.length === 0 && sections.has("Source Roots")) problems.push("`## Source Roots` lists no folder");
    for (const root of sourceRoots) {
        if (!existsSync(root) || !statSync(root).isDirectory()) problems.push(`source root ${root} is not a folder`);
    }
    const stack = itemsOf(need("Target Stack"));
    if (sections.has("Target Stack") && (stack.length === 0 || isNone(stack))) {
        problems.push("`## Target Stack` is empty: the plan cannot name a layer without it");
    }
    const pairs = (name: string, what: string) => {
        const items = itemsOf(need(name));
        if (isNone(items)) return [];
        return items.flatMap((item) => {
            const pair = splitPair(item);
            if (pair === undefined) problems.push(`\`## ${name}\` line "${item}" is not \`<${what}>: <text>\``);
            return pair === undefined ? [] : [pair];
        });
    };
    const leaveOut = pairs("Leave Out", "pattern");
    const documents = pairs("Documents", "path");
    const notes = itemsOf(need("Additional Notes"));
    const goals = proseOf(sections.get("Goals"));
    if (problems.length > 0) throw new RequestInvalid(problems);
    return Schema.decodeUnknownSync(ModernizationRequest)({
        outputRoot: abs(outputRoot ?? ""),
        sourceRoots,
        leaveOut: leaveOut.map(([pattern, reason]) => ({ pattern, reason })),
        target: abs(target ?? ""),
        stack,
        documents: documents.map(([path, whatItIs]) => ({ path: abs(path), whatItIs })),
        notes: isNone(notes) ? [] : notes,
        ...(goals === undefined ? {} : { goals }),
    });
};

export const readRequest = (path: string) => parseRequest(readFileSync(path, "utf8"), dirname(resolve(path)));
