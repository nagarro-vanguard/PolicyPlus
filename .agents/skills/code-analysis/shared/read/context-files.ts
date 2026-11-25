import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { CONTEXT_LABELS as L } from "./context-labels";

/*
 * The texts a reader copies, one per node, written from the payloads' typed records: what the node is, what it does or
 * holds, the rules and evidence it rests on, what uses it, what is unsure and where to look. A text holds no record id,
 * and no number bounds it. A node's file is named by an index entry; the index says which record each file is about.
 */

type Sections = {
    whatItIs: string;
    holds?: readonly string[];
    rules?: readonly string[];
    usedBy?: readonly string[];
    evidence?: readonly string[];
    unsure?: readonly string[];
    whereToLook?: readonly string[];
};

type Place = { readonly file: string; readonly firstLine: number; readonly lastLine: number };
type Context = {
    readonly scope: string;
    readonly inside: readonly string[];
    readonly insideLabel: string;
    readonly lookFirst: readonly string[];
    readonly layers: readonly string[];
    readonly saves: readonly string[];
    readonly reads: readonly string[];
    readonly rules: readonly string[];
    readonly unconfirmed: readonly string[];
    readonly notFollowed: readonly string[];
    readonly commit: string;
};

export type Entry = { readonly kind: string; readonly keys: Record<string, string>; readonly file: string };

const bullets = (lines: readonly string[]) => lines.map((line) => `- ${line}`);
const group = (heading: string, lines: readonly string[]) => (lines.length === 0 ? [] : [`${heading}:`, ...bullets(lines)]);

/** The text of one node: each section that has content, under its heading, in the catalogue's order. */
export const render = (sections: Sections): string => {
    const out: string[] = [];
    const put = (heading: string, lines: readonly string[] | undefined) => {
        if (lines === undefined || lines.length === 0) return;
        out.push(`## ${heading}`, "", ...lines, "");
    };
    out.push(`## ${L.whatItIs}`, "", sections.whatItIs, "");
    put(L.holds, sections.holds);
    put(L.rules, sections.rules);
    put(L.usedBy, sections.usedBy);
    put(L.evidence, sections.evidence);
    put(L.unsure, sections.unsure);
    put(L.whereToLook, sections.whereToLook);
    return `${out.join("\n").trimEnd()}\n`;
};

/** The sections a place's typed context gives, for a place that is a map (system, area, capability, screen). */
export const sectionsOfContext = (context: Context, extra: Partial<Sections> = {}): Sections => ({
    whatItIs: context.scope,
    holds: [
        ...group(context.insideLabel === "" ? "Inside" : context.insideLabel, context.inside),
        ...group(L.layers, context.layers),
        ...group(L.saves, context.saves),
        ...group(L.reads, context.reads),
        ...(extra.holds ?? []),
    ],
    rules: context.rules,
    unsure: [...group(L.unconfirmed, context.unconfirmed), ...group(L.notFollowed, context.notFollowed)],
    whereToLook: context.lookFirst,
    ...(extra.usedBy === undefined ? {} : { usedBy: extra.usedBy }),
});

/** A reader of the analysed code: the lines of a place, whole, or nothing when the file cannot be read. */
export const sourceOf = (roots: readonly string[]) => {
    const files = new Map<string, string[] | null>();
    const lines = (file: string): string[] | null => {
        if (files.has(file)) return files.get(file) ?? null;
        let read: string[] | null = null;
        for (const root of roots) {
            const full = normalize(join(root, file));
            try {
                if (full.startsWith(normalize(root) + sep) && existsSync(full) && statSync(full).isFile()) {
                    read = readFileSync(full, "utf8").split(/\r?\n/);
                    break;
                }
            } catch {
                // not under this root
            }
        }
        files.set(file, read);
        return read;
    };
    return {
        excerpt: (place: Place): string[] => {
            const all = lines(place.file);
            if (all === null || place.firstLine < 1 || place.firstLine > all.length) return [];
            const last = Math.min(Math.max(place.firstLine, place.lastLine), all.length);
            const fence = "```";
            return [
                L.code(place.file, place.firstLine, last),
                fence,
                ...all.slice(place.firstLine - 1, last).map((line, at) => `${place.firstLine + at}: ${line.replace(/\t/g, "    ")}`),
                fence,
            ];
        },
    };
};
