import { Effect } from "effect";
import { readAgentOutput } from "../../shared/read/record-reading";
import { lineSpan } from "../../shared/model/line-ranges";
import { sourceReader } from "../../shared/source/source-text";
import { mapShapes } from "./check-map";

const commentOpeners = ["//", "#", "/*", "*", "--", "<!--", "'", "REM ", "rem "];

/**
 * What a script can tell of a source line at a glance, for the reviewer who reads a link's two ends side by side: blank,
 * a comment, or only closing marks. A flag is a hint of where to look, never a judgement of the link.
 * @param text the line
 * @returns the flag, or none for a line that holds code
 */
const flagOf = (text: string) => {
    const line = text.trim();
    if (line === "") {
        return " [blank line]";
    }
    if ([...line].every((char) => "})];,>".includes(char))) {
        return " [only closing marks]";
    }
    return commentOpeners.some((opener) => line.startsWith(opener)) ? " [a comment]" : "";
};

/**
 * The sheet of a Map job's links: for each, the line that makes it and the line it reaches side by side, from the
 * source files, so a reviewer sees at once a target that is no block's line. A link to an external system or with no
 * target shows what it names.
 * @param root the analysis root
 * @param outputPath the job's output
 * @returns the sheet's text
 */
export const linkSheet = Effect.fnUntraced(function* (root: string, outputPath: string) {
    const { sourceText } = yield* sourceReader(root);
    const files = new Map<string, readonly string[]>();
    const lineAt = Effect.fnUntraced(function* (file: string, line: number) {
        if (!files.has(file)) {
            files.set(file, (yield* sourceText(file).pipe(Effect.orElseSucceed(() => ""))).split("\n"));
        }
        const held = files.get(file);
        const text = held === undefined ? undefined : held[line - 1];
        return text === undefined ? "" : text;
    });
    const links = (yield* readAgentOutput(outputPath, mapShapes)).of("Link");
    const rows: string[] = [];
    for (const link of links) {
        const from = (yield* lineAt(link.lines.file, link.lines.firstLine)).trim().slice(0, 160);
        const target = link.to;
        const to =
            target === undefined
                ? `no target: ${link.unresolvedTarget}`
                : "file" in target
                  ? `${target.file}:${target.line}: ${(yield* lineAt(target.file, target.line)).trim().slice(0, 160)}${flagOf(yield* lineAt(target.file, target.line))}`
                  : `${target.externalSystem} ${target.resource}`;
        rows.push(`${link.id} (${link.kind}) ${lineSpan(link.lines)}: ${from}  ->  ${to}`);
    }
    return `## The links of the job: the line that makes each and the line it reaches\n${rows.length ? rows.join("\n") : "none"}`;
});
