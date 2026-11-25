import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import type { Facts } from "./facts";

/*
 * A short excerpt of the code behind each rule: at most 15 lines from the place the rule cites, read from the analysed
 * code when its folder can be read. When it cannot, or the file is gone, the rule simply has no excerpt; compose never
 * fails for it. Paths stay relative to the analysed code's root.
 */

export const excerptLines = 15;

export type Excerpt = { file: string; firstLine: number; lastLine: number; lines: string[]; cut: boolean };

/**
 * The excerpts of every rule whose cited file can be read.
 * @param facts the facts
 * @param sourceRoot the analysed code's folder, when known
 * @returns the excerpt of each rule, by rule id
 */
export const evidenceOf = (facts: Facts, sourceRoot: string | undefined): Record<string, Excerpt> => {
    const out: Record<string, Excerpt> = {};
    if (sourceRoot === undefined || !existsSync(sourceRoot)) return out;
    const files = new Map<string, string[] | null>();
    const linesOf = (file: string) => {
        if (files.has(file)) return files.get(file) ?? null;
        const full = normalize(join(sourceRoot, file));
        let lines: string[] | null = null;
        try {
            if (full.startsWith(normalize(sourceRoot) + sep) && statSync(full).isFile()) {
                lines = readFileSync(full, "utf8").split(/\r?\n/);
            }
        } catch {
            lines = null;
        }
        files.set(file, lines);
        return lines;
    };
    for (const rule of facts.rules) {
        const lines = linesOf(rule.place.file);
        if (lines === null || rule.place.firstLine < 1 || rule.place.firstLine > lines.length) continue;
        const last = Math.max(rule.place.firstLine, Math.min(rule.place.lastLine, lines.length));
        const shownLast = Math.min(last, rule.place.firstLine + excerptLines - 1);
        out[rule.id] = {
            file: rule.place.file,
            firstLine: rule.place.firstLine,
            lastLine: shownLast,
            lines: lines.slice(rule.place.firstLine - 1, shownLast).map((line) => line.replace(/\t/g, "    ")),
            cut: shownLast < last,
        };
    }
    return out;
};

/**
 * Whether a cited place lies in the analysed code: its file is there and its lines are inside the file.
 * @param sourceRoot the analysed code's folder, when known
 * @returns a check that says true or false, or null for every place when the code cannot be read
 */
export const placeCheck = (sourceRoot: string | undefined) => {
    const readable = sourceRoot !== undefined && existsSync(sourceRoot);
    const counts = new Map<string, number | null>();
    const countOf = (file: string) => {
        if (counts.has(file)) return counts.get(file) ?? null;
        let count: number | null = null;
        try {
            const full = normalize(join(sourceRoot as string, file));
            if (full.startsWith(normalize(sourceRoot as string) + sep) && statSync(full).isFile())
                count = readFileSync(full, "utf8").split(/\r?\n/).length;
        } catch {
            count = null;
        }
        counts.set(file, count);
        return count;
    };
    return (place: { file: string; firstLine: number; lastLine: number }): boolean | null => {
        if (!readable) return null;
        const count = countOf(place.file);
        return count !== null && place.firstLine >= 1 && place.lastLine >= place.firstLine && place.lastLine <= count;
    };
};
