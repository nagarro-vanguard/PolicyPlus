// The reader contract (C1 to C11 of plans/ux-port/audit/A §7) as detectors over rendered HTML, the app's own copy and
// the producers' data. Pages are read with a real HTML parser (Bun's HTMLRewriter), so attributes are checked and a "<"
// inside an attribute cannot cut a tag short. Text inside an element marked `data-for-assistant`, and the value of a
// `data-copy-text` or `data-for-assistant` attribute, is the coding assistant's and is exempt. Ordinary words that are
// also pipeline words ("held", "stage", "bundle") are matched only in the app's copy and in elements marked
// `data-written-by="app"` or `data-written-by="agent"`, never in the product's own words; path patterns are anchored, so
// "/Api/Users/1" is not a home folder. Every detector counts every match, not the first one per page.

import { sentencesOf, voiceFindings } from "./voice";

export type ContractCheck = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8" | "C9" | "C10" | "C11";
export type ContractMode = "hard" | "report";

export type ContractFinding = {
    readonly check: ContractCheck;
    readonly mode: ContractMode;
    readonly rule: string;
    readonly hit: string;
    /** The page, copy module or data field. */
    readonly where: string;
    /** `text`, `attr:<name>`, `whole:<tag>`, `copy` or `data`. */
    readonly at: string;
};

export type PageOptions = {
    /** Raw enum values of the producers' schemas (C3). */
    readonly enums?: ReadonlySet<string>;
    /** The overview page, where C9 is hard. Defaults to `index.html`. */
    readonly overview?: boolean;
    /** Report-mode findings a page may carry before C11 fails it. */
    readonly budget?: number;
    /** Words in a sentence before C7 reports it, and before it fails. */
    readonly sentence?: { readonly report: number; readonly hard: number };
};

// ---- Patterns ----

/** C1: a record id or a key: kind, hyphen and 8+ digits or 12 hex digits; an epic key. */
const recordIds: readonly RegExp[] = [
    /(?<![\p{L}\p{N}_-])[a-z]+(?:-[a-z]+)*-(?:\d{8,}|[0-9a-f]{12})(?![\p{L}\p{N}_])/gu,
    /(?<![\p{L}\p{N}_-])(?:area|capability):(?=[^\s"'<>])\S+/gu,
];

/** C2, matched wherever a reader can see them: no product says these. */
const pipelineAnywhere: readonly [string, RegExp][] = [
    [
        "a skill's name",
        /(?<![\w-])(?:code-analysis|shape-target|shape-and-deliver|plan-modernization-backlog|scaffold-codebase|create-work-item|create-branch|decide-foundation|create-stories|brief-the-system)(?![\w-])/g,
    ],
    [
        "a folder of the pipeline",
        /(?<![\w.])\.(?:modernization(?:-backlog)?|agents|code-analysis|shape-target)(?![\w-])/g,
    ],
    // Anchored: a home folder starts a path, so "/Api/Users/1" (an address of the product) is not one.
    ["a home folder", /(?<![\w./\\-])(?:\/Users\/|\/home\/)[\w.-]+|\b[A-Z]:\\Users\\[\w.-]+/g],
    ["a command", /(?<![\w-])bun\s+(?:run\s|test\b|x\s|[\w./${}-]+\.ts\b|cli\/)/g],
    ["a setting for a command", /(?<![\w])[A-Z][A-Z0-9_]{5,}=(?=\S)/g],
    ["a machine timestamp", /\b\d{4}-\d\d-\d\dT\d\d:\d\d/g],
    [
        "a file of the pipeline",
        /(?<![\w-])(?:plan|system|knowledge|request|state|journeys|architecture|ledger|manifest|prompts|current|legacy|essence|language-report|choice-[a-z-]+|[a-z-]+-variants)\.json\b/g,
    ],
    [
        "a state of the pipeline",
        /\b(?:plan (?:is )?held|held until (?:decision|you confirm)|(?:is|are) held because|current plan|confirmed again|tag sets?|full bundle|publish stage|baseline for comparison)\b/gi,
    ],
];

/** C2, matched only in the app's copy and in text marked as written by the app or an agent: ordinary words elsewhere. */
const pipelineWords: readonly [string, RegExp][] = [
    [
        "a word of the pipeline",
        /\b(?:ledgers?|baselines?|bundles?|payloads?|fingerprints?|prompts?|attachments?|workflows?|gates?|stages?|re-?runs?|ran again|not recorded|held|tiers?|mockups?|variants?)\b/gi,
    ],
    ["a confidence flag", /\b(?:Inferred|Sure)\b/g],
    ["a data file", /\b[\w-]+\.json\b/g],
];

/** C3: what a raw value looks like when it is the whole text of an element. */
const camelToken = /^[a-z]+(?:[A-Z][a-z0-9]+)+$/;
const confidenceFlags = new Set(["Inferred", "Sure", "inferred", "sure"]);

/** C8: words a reader outside the team may not know; the first use on a page links or defines it. */
export const jargon = [
    "domain",
    "component",
    "layer",
    "routine",
    "adapter",
    "deployable",
    "container",
    "module",
    "POL",
    "ADMX",
    "ADML",
    "SID",
    "TLS",
] as const;
const jargonPattern = new RegExp(`\\b(?:${jargon.join("|")})s?\\b`, "g");

/** C9: numbers that answer no reader question, outside a fold. */
const bookkeeping: readonly RegExp[] = [
    /\badds? (?:up )?to \d/gi,
    /\bcounted once\b/gi,
    /\bscreen uses\b/gi,
    /\b(?:a|the|its) reach\b/gi,
    /\bof them rest on\b/gi,
    /\broutines\b/gi,
    /\bentry points?\b/gi,
];

// ---- Text helpers ----

const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…" };
/** HTMLRewriter hands text and attributes over as written: decode the entities a page uses. */
export const decodeEntities = (text: string) =>
    text.replaceAll(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
        if (code.startsWith("#x") || code.startsWith("#X"))
            return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
        if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
        return named[code.toLowerCase()] ?? whole;
    });

const squash = (text: string) => text.replaceAll(/\s+/g, " ").trim();
const around = (text: string, index: number, length: number) =>
    squash(text.slice(Math.max(0, index - 40), index + length + 40));
const wordCount = (sentence: string) => sentence.split(/\s+/).filter((word) => /\p{L}|\p{N}/u.test(word)).length;

const hits = (text: string, pattern: RegExp) =>
    [...text.matchAll(pattern)].map((match) => ({ index: match.index ?? 0, match: match[0] }));

// ---- The page, parsed ----

type Segment = {
    readonly text: string;
    readonly exempt: boolean;
    readonly marked: boolean;
    readonly fold: boolean;
    readonly defined: boolean;
    readonly code: boolean;
};
type Attribute = {
    readonly name: string;
    readonly value: string;
    readonly tag: string;
    readonly exempt: boolean;
    readonly marked: boolean;
};
type Whole = { readonly tag: string; readonly text: string; readonly code: boolean };
type Block = { readonly text: string; readonly section: number };

type Frame = {
    tag: string;
    exempt: boolean;
    marked: boolean;
    fold: boolean;
    defined: boolean;
    code: boolean;
    skip: boolean;
    block: boolean;
    text: string;
    blockText: string;
    /** The whole text of the last child that ended, so a wrapper with the same text is not counted again. */
    lastWhole: string;
};

const blockTags = new Set([
    "p",
    "li",
    "td",
    "th",
    "dd",
    "dt",
    "summary",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "figcaption",
    "caption",
    "blockquote",
    "label",
    "button",
    "legend",
]);
const skipped = new Set(["script", "style", "template", "noscript"]);
const codeTags = new Set(["code", "pre", "kbd", "samp"]);
/** Attributes a reader reads or hears. */
const visibleAttributes = new Set([
    "title",
    "aria-label",
    "aria-description",
    "aria-roledescription",
    "placeholder",
    "alt",
    "label",
    "aria-valuetext",
]);
/** Attributes that only style or wire up the page. */
const wiringAttributes = new Set([
    "class",
    "style",
    "d",
    "viewBox",
    "points",
    "transform",
    "width",
    "height",
    "x",
    "y",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "fill",
    "stroke",
    "integrity",
    "type",
    "rel",
    "lang",
    "dir",
    "role",
    "srcset",
    "media",
    "sizes",
    "content",
]);
const assistantAttributes = new Set(["data-copy-text", "data-for-assistant"]);

export type ParsedPage = {
    readonly segments: readonly Segment[];
    readonly attributes: readonly Attribute[];
    readonly wholes: readonly Whole[];
    readonly blocks: readonly Block[];
};

/**
 * Reads a page into what a reader meets: text with where it sits (assistant-only, marked, in a fold, defined, code),
 * attributes, the whole text of short elements and the text of each innermost block.
 * @param html the page, static or serialized after its scripts ran
 * @returns the parts the detectors read
 */
export const parsePage = async (html: string): Promise<ParsedPage> => {
    const segments: Segment[] = [];
    const attributes: Attribute[] = [];
    const wholes: Whole[] = [];
    const blocks: Block[] = [];
    const stack: Frame[] = [];
    let section = 0;
    const top = () => stack[stack.length - 1];
    await new HTMLRewriter()
        .on("*", {
            element(el) {
                const parent = top();
                const tag = el.tagName.toLowerCase();
                const writtenBy = el.getAttribute("data-written-by");
                const frame: Frame = {
                    tag,
                    exempt: (parent?.exempt ?? false) || el.hasAttribute("data-for-assistant"),
                    marked:
                        writtenBy === "app" ||
                        writtenBy === "agent" ||
                        (writtenBy === null && (parent?.marked ?? false)),
                    fold: (parent?.fold ?? false) || (parent?.tag === "details" && tag !== "summary"),
                    defined:
                        (parent?.defined ?? false) ||
                        tag === "dfn" ||
                        (tag === "abbr" && el.hasAttribute("title")) ||
                        el.hasAttribute("data-term"),
                    code: (parent?.code ?? false) || codeTags.has(tag),
                    skip: (parent?.skip ?? false) || skipped.has(tag),
                    block: blockTags.has(tag),
                    text: "",
                    blockText: "",
                    lastWhole: "",
                };
                if (tag === "details") frame.fold = parent?.fold ?? false;
                if (tag === "h2") section += 1;
                for (const [name, value] of el.attributes) {
                    attributes.push({
                        name,
                        value: decodeEntities(value),
                        tag,
                        exempt: frame.exempt,
                        marked: frame.marked,
                    });
                }
                // Elements part words: the text of two cells is two words, not one.
                if (parent !== undefined && !parent.skip)
                    segments.push({
                        text: " ",
                        exempt: parent.exempt,
                        marked: parent.marked,
                        fold: parent.fold,
                        defined: parent.defined,
                        code: parent.code,
                    });
                for (const open of stack) {
                    if (open.text.length <= 60) open.text += " ";
                    open.blockText += " ";
                }
                if (!el.canHaveContent || el.selfClosing) return;
                stack.push(frame);
                el.onEndTag(() => {
                    const done = stack.pop();
                    if (done === undefined || done.skip) return;
                    const whole = squash(done.text);
                    if (!done.exempt && whole !== "" && whole.length <= 60 && whole !== done.lastWhole)
                        wholes.push({ tag: done.tag, text: whole, code: done.code });
                    const parent = top();
                    if (parent !== undefined) parent.lastWhole = whole;
                    if (done.block && !done.exempt && !done.code && squash(done.blockText) !== "")
                        blocks.push({ text: squash(done.blockText), section });
                });
            },
        })
        .onDocument({
            text(chunk) {
                const frame = top();
                if (chunk.text === "" || frame === undefined || frame.skip) return;
                const text = decodeEntities(chunk.text);
                segments.push({
                    text,
                    exempt: frame.exempt,
                    marked: frame.marked,
                    fold: frame.fold,
                    defined: frame.defined,
                    code: frame.code,
                });
                for (const open of stack) if (open.text.length <= 60) open.text += text;
                const block = [...stack].reverse().find((open) => open.block);
                if (block !== undefined) block.blockText += text;
            },
        })
        .transform(new Response(html))
        .text();
    return { segments, attributes, wholes, blocks };
};

// ---- Detectors ----

/**
 * Every place a reader-contract rule is broken on one page.
 * @param html the page (static, or the DOM serialized after its scripts ran)
 * @param where the page's path below the site's root
 * @param options enums, budgets and whether the page was rendered
 * @returns the findings, every match counted
 */
export const pageFindings = async (
    html: string,
    where: string,
    options: PageOptions = {},
): Promise<ContractFinding[]> => {
    const page = await parsePage(html);
    const found: ContractFinding[] = [];
    const push = (check: ContractCheck, mode: ContractMode, rule: string, hit: string, at: string) =>
        found.push({ check, mode, rule, hit, where, at });
    // Text runs are joined so a word split across chunks is still one word.
    const runs = joinRuns(page.segments);
    const reader = runs.filter((run) => !run.exempt);

    // C1: ids in the text, every attribute and the page's own file name.
    for (const run of reader)
        for (const pattern of recordIds)
            for (const hit of hits(run.text, pattern))
                push(
                    "C1",
                    "hard",
                    "a record id or key is shown",
                    around(run.text, hit.index, hit.match.length),
                    "text",
                );
    for (const attribute of page.attributes) {
        if (attribute.exempt || assistantAttributes.has(attribute.name) || wiringAttributes.has(attribute.name))
            continue;
        const value =
            attribute.name === "href" || attribute.name === "src" ? safeDecode(attribute.value) : attribute.value;
        for (const pattern of recordIds)
            for (const hit of hits(value, pattern))
                push(
                    "C1",
                    "hard",
                    "a record id or key is shown",
                    around(value, hit.index, hit.match.length),
                    `attr:${attribute.name}`,
                );
    }
    for (const pattern of recordIds)
        for (const hit of hits(where, pattern))
            push("C1", "hard", "a file name carries a record id", hit.match, "file");

    // C2: pipeline vocabulary.
    for (const run of reader) {
        for (const [rule, pattern] of pipelineAnywhere)
            for (const hit of hits(run.text, pattern))
                push("C2", "hard", rule, around(run.text, hit.index, hit.match.length), "text");
        if (!run.marked) continue;
        for (const [rule, pattern] of pipelineWords)
            for (const hit of hits(run.text, pattern))
                push("C2", "hard", rule, around(run.text, hit.index, hit.match.length), "text");
    }
    for (const attribute of page.attributes) {
        if (attribute.exempt || assistantAttributes.has(attribute.name) || wiringAttributes.has(attribute.name))
            continue;
        if (attribute.name === "src" || attribute.name === "id") continue;
        for (const [rule, pattern] of pipelineAnywhere)
            for (const hit of hits(attribute.value, pattern))
                push(
                    "C2",
                    "hard",
                    rule,
                    around(attribute.value, hit.index, hit.match.length),
                    `attr:${attribute.name}`,
                );
        if (!attribute.marked) continue;
        for (const [rule, pattern] of pipelineWords)
            for (const hit of hits(attribute.value, pattern))
                push(
                    "C2",
                    "hard",
                    rule,
                    around(attribute.value, hit.index, hit.match.length),
                    `attr:${attribute.name}`,
                );
    }

    // C3: a raw value as the whole text of an element or of a visible attribute.
    const raw = (text: string) =>
        confidenceFlags.has(text) || camelToken.test(text) || (text.length >= 3 && (options.enums?.has(text) ?? false));
    for (const whole of page.wholes)
        if (!whole.code && raw(whole.text))
            push("C3", "hard", "a raw value is shown", whole.text, `whole:${whole.tag}`);
    for (const attribute of page.attributes)
        if (!attribute.exempt && visibleAttributes.has(attribute.name) && raw(squash(attribute.value)))
            push("C3", "hard", "a raw value is shown", attribute.value, `attr:${attribute.name}`);

    // C7, C10: sentences of each innermost block.
    const limits = options.sentence ?? { report: 25, hard: 40 };
    const seen = new Map<string, number>();
    const counts = new Map<string, Set<number>>();
    for (const block of page.blocks) {
        // Only prose counts: a run of labels and links with no full stop is a list, not a sentence.
        for (const sentence of sentencesOf(block.text).filter((each) => /[.!?]["')\u201d]?$/.test(each))) {
            const n = wordCount(sentence);
            if (n > limits.hard)
                push(
                    "C7",
                    "hard",
                    `a sentence over ${limits.hard} words`,
                    `${n} words: ${sentence.slice(0, 120)}`,
                    "text",
                );
            else if (n > limits.report)
                push(
                    "C7",
                    "report",
                    `a sentence over ${limits.report} words`,
                    `${n} words: ${sentence.slice(0, 120)}`,
                    "text",
                );
            if (n >= 6) seen.set(sentence, (seen.get(sentence) ?? 0) + 1);
        }
        for (const hit of hits(block.text, /\b\d[\d,]* [a-z]+(?: [a-z]+)?\b/g)) {
            const sections = counts.get(hit.match) ?? new Set<number>();
            sections.add(block.section);
            counts.set(hit.match, sections);
        }
    }
    for (const [sentence, times] of seen)
        if (times > 1)
            push("C10", "report", "the same sentence twice on a page", `${times}x: ${sentence.slice(0, 120)}`, "text");
    for (const [count, sections] of counts)
        if (sections.size > 1)
            push("C10", "report", "a count repeated in two sections", `${count} (${sections.size} sections)`, "text");

    // C8: the first use of a jargon word is defined or linked.
    const firstUse = new Map<string, boolean>();
    for (const run of reader) {
        if (run.code) continue;
        for (const hit of hits(run.text, jargonPattern)) {
            const term = hit.match.replace(/s$/, "");
            if (!firstUse.has(term)) firstUse.set(term, run.defined);
        }
    }
    for (const [term, defined] of firstUse)
        if (!defined) push("C8", "report", "jargon used without a definition", term, "text");

    // C9: bookkeeping numbers outside a fold; hard on the overview.
    const overview = options.overview ?? where === "index.html";
    for (const run of reader) {
        if (run.fold) continue;
        for (const pattern of bookkeeping)
            for (const hit of hits(run.text, pattern))
                push(
                    "C9",
                    overview ? "hard" : "report",
                    "a number that answers no reader question",
                    around(run.text, hit.index, hit.match.length),
                    "text",
                );
    }

    // C11: every hit is counted above; a page over its budget of reported findings fails.
    const reported = found.filter((finding) => finding.mode === "report").length;
    const budget = options.budget ?? 40;
    if (reported > budget)
        push("C11", "hard", `more than ${budget} reported findings on one page`, `${reported} reported`, "page");
    return found;
};

const safeDecode = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

type Run = { text: string; exempt: boolean; marked: boolean; fold: boolean; defined: boolean; code: boolean };
/** Neighbouring text chunks with the same standing, joined. */
const joinRuns = (segments: readonly Segment[]): Run[] => {
    const runs: Run[] = [];
    for (const segment of segments) {
        const last = runs[runs.length - 1];
        const same =
            last !== undefined &&
            last.exempt === segment.exempt &&
            last.marked === segment.marked &&
            last.fold === segment.fold &&
            last.defined === segment.defined &&
            last.code === segment.code;
        if (same) last.text += segment.text;
        else runs.push({ ...segment });
    }
    return runs;
};

/**
 * C2, C5 and C7 on the app's own copy: every string a copy module writes.
 * @param strings the strings, each with the module and line it comes from
 * @param limit the most words a sentence of app copy may have
 * @returns the findings, all hard
 */
export const copyFindings = (strings: readonly { text: string; where: string }[], limit = 20): ContractFinding[] => {
    const found: ContractFinding[] = [];
    for (const { text, where } of strings) {
        const push = (check: ContractCheck, rule: string, hit: string) =>
            found.push({ check, mode: "hard", rule, hit, where, at: "copy" });
        for (const [rule, pattern] of [...pipelineAnywhere, ...pipelineWords])
            for (const hit of hits(text, pattern)) push("C2", rule, around(text, hit.index, hit.match.length));
        for (const voice of voiceFindings(text)) push("C5", voice.rule, voice.hit);
        for (const sentence of sentencesOf(text)) {
            const n = wordCount(sentence);
            if (n > limit)
                push("C7", `app copy over ${limit} words a sentence`, `${n} words: ${sentence.slice(0, 120)}`);
        }
    }
    return found;
};

/**
 * C6 and C7 on the producers' data: the tells and the sentence length of every string field, counted per field.
 * @param records the strings, each with its field's path (such as `capability.rules[].says`)
 * @param limits words a sentence may have before it is reported, and before it fails
 * @returns the findings
 */
export const dataFindings = (
    records: readonly { text: string; field: string }[],
    limits: { report: number; hard: number } = { report: 25, hard: 40 },
): ContractFinding[] => {
    const found: ContractFinding[] = [];
    for (const { text, field } of records) {
        for (const voice of voiceFindings(text))
            found.push({ check: "C6", mode: "report", rule: voice.rule, hit: voice.hit, where: field, at: "data" });
        for (const sentence of sentencesOf(text)) {
            const n = wordCount(sentence);
            if (n > limits.hard)
                found.push({
                    check: "C7",
                    mode: "hard",
                    rule: `a sentence over ${limits.hard} words`,
                    hit: `${n} words`,
                    where: field,
                    at: "data",
                });
            else if (n > limits.report)
                found.push({
                    check: "C7",
                    mode: "report",
                    rule: `a sentence over ${limits.report} words`,
                    hit: `${n} words`,
                    where: field,
                    at: "data",
                });
        }
    }
    return found;
};

/**
 * The prose strings of a JSON document, with a field path that names arrays by `[]`: what a reader may be shown.
 * @param value the parsed document
 * @param path the document's name
 * @returns every string of two words or more
 */
export const proseOf = (value: unknown, path: string): { text: string; field: string }[] => {
    if (typeof value === "string")
        return /\p{L}+\s+\p{L}+/u.test(value) && !/^[\w./\\:-]+$/.test(value) ? [{ text: value, field: path }] : [];
    if (Array.isArray(value)) return value.flatMap((item) => proseOf(item, `${path}[]`));
    if (value !== null && typeof value === "object")
        return Object.entries(value).flatMap(([key, item]) => proseOf(item, `${path}.${key}`));
    return [];
};

/**
 * Every enum value of a set of JSON Schemas: what C3 refuses as the whole text of an element.
 * @param schemas the parsed schemas
 * @returns the values
 */
export const enumsOf = (schemas: readonly unknown[]): Set<string> => {
    const values = new Set<string>();
    const walk = (node: unknown) => {
        if (Array.isArray(node)) for (const item of node) walk(item);
        else if (node !== null && typeof node === "object") {
            const record = node as Record<string, unknown>;
            if (Array.isArray(record.enum))
                for (const value of record.enum) if (typeof value === "string") values.add(value);
            if (typeof record.const === "string") values.add(record.const);
            for (const item of Object.values(record)) walk(item);
        }
    };
    for (const schema of schemas) walk(schema);
    return values;
};

/**
 * The prose a TypeScript module writes: its string and template literals of two words or more, with their line.
 * Placeholders in a template read as "N". Import paths and property names are left out.
 * @param source the module's text
 * @param file the module's name
 * @returns the strings
 */
export const stringsOfSource = async (source: string, file: string): Promise<{ text: string; where: string }[]> => {
    const ts = await import("typescript");
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const out: { text: string; where: string }[] = [];
    const add = (node: import("typescript").Node, text: string) => {
        if (!/\p{L}+\s+\p{L}+/u.test(text)) return;
        const line = tree.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        out.push({ text, where: `${file}:${line}` });
    };
    const visit = (node: import("typescript").Node) => {
        const parent = node.parent;
        const skip =
            parent !== undefined &&
            (ts.isImportDeclaration(parent) ||
                ts.isExportDeclaration(parent) ||
                (ts.isPropertyAssignment(parent) && parent.name === node) ||
                ts.isLiteralTypeNode(parent));
        if (!skip && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) add(node, node.text);
        else if (ts.isTemplateExpression(node)) {
            add(node, [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join("N"));
            return;
        }
        ts.forEachChild(node, visit);
    };
    visit(tree);
    return out;
};
