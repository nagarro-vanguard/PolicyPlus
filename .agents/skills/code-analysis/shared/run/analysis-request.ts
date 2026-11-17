import { isAbsolute, resolve } from "node:path";
import { Effect, Schema } from "effect";
import { AnalysisRequestInvalid } from "./script-errors";
import { FileAccess } from "../source/file-access";
import { isInsideFolder } from "./analysis-layout";
import { about } from "../model/shared-fields";

export const AnalysisRequest = Schema.Struct({
    sourceRoots: Schema.NonEmptyArray(Schema.String).annotate(
        about("Every folder analysed, as an absolute path; at least one."),
    ),
    leaveOut: Schema.Array(
        Schema.Struct({
            pattern: Schema.String.annotate(about("Files left out, in .gitignore syntax.")),
            reason: Schema.String.annotate(about("Why, in the person's words.")),
        }),
    ).annotate(about("What the person decided not to analyse.")),
    supportingMaterial: Schema.Array(
        Schema.Struct({
            path: Schema.String.annotate(about("A file outside the code, as an absolute path.")),
            whatItIs: Schema.String.annotate(about("What it is, in the person's words.")),
        }),
    ).annotate(about("Material outside the code that helps: schema exports, menus, guides, team notes.")),
}).annotate(about("The run's settings, read from the person's request."));

export type AnalysisRequest = typeof AnalysisRequest.Type;

export const requestHelp = [
    "The request is markdown with one `## <Section>` per setting; HTML comments and unknown sections are ignored.",
    "`## Output Root`: the folder the analysis is kept in (required).",
    "`## Source Roots` (required), one `- <folder>` per line, each a folder: inside a git repository, what it tracks is the code (its `.gitignore` files honoured); any other folder, as exported datasets often are, is listed whole; no folder inside another;",
    "`## Leave Out`, one `- <pattern>: <reason>` per line; `## Supporting Material`, one `- <path>: <what it is>` per line.",
].join(" ");

/**
 * The text with every `<!-- … -->` comment taken out, so the template's guidance never reads as a value.
 * @param text the request's text
 * @returns the text without comments; an unclosed comment runs to the end
 */
function withoutComments(text: string): string {
    let kept = "";
    let at = 0;
    for (let open = text.indexOf("<!--"); open >= 0; open = text.indexOf("<!--", at)) {
        kept += text.slice(at, open);
        const close = text.indexOf("-->", open + 4);
        at = close < 0 ? text.length : close + 3;
    }
    return kept + text.slice(at);
}

/**
 * The request's `## ` sections, each with its lines, keyed by heading.
 * @param text the request's text, comments removed
 * @returns each section's lines by its heading, in file order
 */
function sections(text: string): Map<string, string[]> {
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
}

/**
 * The items of a section's `- ` list.
 * @param lines the section's lines; absent when the request has no such section
 * @returns each item's text, trimmed, in order
 */
const listItems = (lines: readonly string[] = []) =>
    lines
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim())
        .filter((item) => item.length > 0);

/**
 * A section's single value: its first non-empty line, written plainly or as a `- ` item.
 * @param lines the section's lines; absent when the request has no such section
 * @returns the value, or empty when the section holds none
 */
function singleValue(lines: readonly string[] = []): string {
    const first = lines.map((line) => line.trim()).find((line) => line.length > 0);
    if (first === undefined) {
        return "";
    }
    return first.startsWith("- ") ? first.slice(2).trim() : first;
}

/**
 * A list item split at its first `: ` into the part before and the part after. Splitting at a colon followed by a
 * space keeps a path such as `C:\src` whole.
 * @param item the list item
 * @returns the two parts, trimmed; the second is empty when there is no `: `
 */
function pair(item: string): [string, string] {
    const at = item.indexOf(": ");
    return at < 0 ? [item.trim(), ""] : [item.slice(0, at).trim(), item.slice(at + 2).trim()];
}

/**
 * A pattern without the double quotes a person may put around it, so a pattern starting with `*` stays safe in markdown.
 * @param pattern the pattern as written
 * @returns the pattern inside the quotes, or the pattern as it is
 */
const unquoted = (pattern: string) =>
    pattern.length > 1 && pattern.startsWith('"') && pattern.endsWith('"') ? pattern.slice(1, -1) : pattern;

/**
 * The error for a request that breaks one of the rules `requestHelp` states.
 * @param issue what is wrong, as the person reads it
 * @returns the error
 */
const invalid = (issue: string) => new AnalysisRequestInvalid({ issue });

/**
 * The first pair of source roots where one is the other or lies inside it: listing both would list the same files
 * twice under the same path, so every file would no longer be listed exactly once.
 * @param roots the source roots, as absolute paths
 * @returns the two roots, or undefined when no two overlap
 */
function overlappingRoots(roots: readonly string[]): [string, string] | undefined {
    for (const [i, first] of roots.entries()) {
        const second = roots.slice(i + 1).find((other) => isInsideFolder(first, other) || isInsideFolder(other, first));
        if (second !== undefined) {
            return [first, second];
        }
    }
    return undefined;
}

/**
 * The run's settings: every source root must be a folder, no two may overlap, and every supporting material must
 * exist.
 * @param bySection the request's sections
 * @param absolute how a path in the request is made absolute
 * @returns the run's settings; AnalysisRequestInvalid naming the first rule broken
 */
const readSettings = Effect.fnUntraced(function* (
    bySection: Map<string, string[]>,
    absolute: (given: string) => string,
) {
    const fs = yield* FileAccess;
    const sourceRoots = listItems(bySection.get("Source Roots")).map(absolute);
    if (sourceRoots.length === 0) {
        return yield* invalid("Source Roots is required");
    }
    for (const sourceRoot of sourceRoots) {
        if (!(yield* fs.isDirectory(sourceRoot))) {
            return yield* invalid(`Source Root ${sourceRoot} is not a folder`);
        }
    }
    const overlap = overlappingRoots(sourceRoots);
    if (overlap) {
        return yield* invalid(`Source Roots ${overlap[0]} and ${overlap[1]} overlap; give each folder once`);
    }
    const supportingMaterial = listItems(bySection.get("Supporting Material")).map((item) => {
        const [given, whatItIs] = pair(item);
        return { path: absolute(given), whatItIs };
    });
    for (const material of supportingMaterial) {
        if (!(yield* fs.exists(material.path))) {
            return yield* invalid(`Supporting Material ${material.path} does not exist`);
        }
    }
    const leaveOut = listItems(bySection.get("Leave Out")).map((item) => {
        const [pattern, reason] = pair(item);
        return { pattern: unquoted(pattern), reason };
    });
    const unexplained = leaveOut.find((rule) => !rule.reason);
    if (unexplained !== undefined) {
        return yield* invalid(`Leave Out ${unexplained.pattern} gives no reason: write \`- <pattern>: <reason>\``);
    }
    return {
        sourceRoots,
        leaveOut,
        supportingMaterial,
    };
});

/**
 * Read the request file at `path` and check it by the rules `requestHelp` states. Paths in it are taken relative to
 * `cwd`. The result is decoded by the AnalysisRequest schema, so what is written is exactly that shape.
 * @param path the request file
 * @param cwd the folder relative paths in the request are resolved against
 * @returns the analysis root and the run's settings; AnalysisRequestInvalid naming the first rule broken
 */
export const readAnalysisRequest = Effect.fnUntraced(function* (path: string, cwd: string) {
    const bySection = sections(withoutComments(yield* (yield* FileAccess).readText(path)));
    const absolute = (given: string) => (isAbsolute(given) ? given : resolve(cwd, given));
    const outputRootText = singleValue(bySection.get("Output Root"));
    if (!outputRootText) {
        return yield* invalid("Output Root is required");
    }
    const outputRoot = absolute(outputRootText);
    const settings = yield* readSettings(bySection, absolute);
    const request = yield* Effect.try({
        try: () => Schema.decodeUnknownSync(AnalysisRequest)(settings),
        catch: (cause) => invalid(String(cause)),
    });
    return { outputRoot, request };
});
