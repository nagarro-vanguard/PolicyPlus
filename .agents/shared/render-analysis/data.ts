/**
 * The reader of a finished code-analysis run: opens its store read-only, reads each job's current review files,
 * and reads the source lines the findings cite. It writes nothing to the run.
 */
import { Database } from "bun:sqlite";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type Lines = { file: string; firstLine: number; lastLine: number };
export type Evidence = { lines: Lines; shows: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- record bodies are read by type below.
export type Rec = { id: string; type: string; stage: string; body: any };
export type Label = "reviewed" | "corrected" | "disputed";
export type Challenge = { verdict: string; explanation: string; evidence: Lines[] };
export type Missed = { stage: string; says: string; evidence: Lines[]; concerns?: string };

export const stageOrder = [
    "inventory",
    "how-it-runs",
    "map",
    "capabilities-and-entities",
    "capability-rules",
    "publish",
] as const;
export type StageKey = (typeof stageOrder)[number];

export const stageTitle: Record<StageKey, string> = {
    inventory: "Inventory",
    "how-it-runs": "How it runs",
    map: "Map",
    "capabilities-and-entities": "Capabilities and entities",
    "capability-rules": "Capability rules",
    publish: "Publish",
};

const catalogueFolder = (skill: string) => join(skill, "shared", "catalogue");

/**
 * Every JSON line of a file that parses; a bad line is skipped and counted by the caller through the result length.
 * @param path the file
 * @returns the parsed lines
 */
const jsonLines = (path: string): any[] => {
    const out: any[] = [];
    for (const line of readFileSync(path, "utf8").split("\n")) {
        const text = line.trim();
        if (text === "") continue;
        try {
            out.push(JSON.parse(text));
        } catch {
            out.push({ __bad: text.slice(0, 80) });
        }
    }
    return out;
};

const walk = (dir: string, found: string[] = []) => {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path, found);
        else if (name === "review.jsonl") found.push(path);
    }
    return found;
};

export type Run = ReturnType<typeof openRun>;

/**
 * Open a run.
 * @param root the analysis root
 * @param source the folder the analysed code is in
 * @param skill the skill folder, for its catalogue words
 * @returns the reader
 */
export function openRun(root: string, source: string, skill: string) {
    const db = new Database(join(root, "analysis.sqlite"), { readonly: true });
    const records = new Map<string, Rec>();
    const byType = new Map<string, Rec[]>();
    const byNumber = new Map<number, string>();
    for (const row of db.query("select recordNumber,id,type,stage,body from record").all() as {
        recordNumber: number;
        id: string;
        type: string;
        stage: string;
        body: string;
    }[]) {
        const rec: Rec = { id: row.id, type: row.type, stage: row.stage, body: JSON.parse(row.body) };
        records.set(rec.id, rec);
        byNumber.set(row.recordNumber, rec.id);
        const list = byType.get(rec.type);
        if (list) list.push(rec);
        else byType.set(rec.type, [rec]);
    }
    const of = (type: string) => byType.get(type) ?? [];
    const rows = <T>(sql: string) => db.query(sql).all() as T[];

    const catalogue = (name: string, key: string) =>
        JSON.parse(readFileSync(join(catalogueFolder(skill), name), "utf8"))[key] as {
            id: string;
            words: string;
            means?: string;
            group?: string;
        }[];
    const aspects = new Map(catalogue("aspects.json", "aspects").map((a) => [a.id, a]));
    const riskCategories = new Map(catalogue("risk-categories.json", "riskCategories").map((a) => [a.id, a]));
    const severities = new Map(catalogue("severity.json", "severities").map((a) => [a.id, a]));
    const confirmWith = new Map(catalogue("confirm-with.json", "confirmWith").map((a) => [a.id, a]));
    const partKinds = new Map(catalogue("part-kinds.json", "partKinds").map((a) => [a.id, a]));

    // ---- review results, read from each job's current review files
    const challenges = new Map<string, { first?: Challenge; final?: Challenge }>();
    const missed: Missed[] = [];
    let reviewFiles = 0;
    let badLines = 0;
    const jobsWithFix = new Set<string>();
    for (const file of walk(join(root, "work"))) {
        if (file.includes("/rounds/")) continue;
        reviewFiles += 1;
        const stage = file.slice(join(root, "work").length + 1).split("/")[0] ?? "";
        const dir = file.slice(0, -"review.jsonl".length);
        const firstFile = join(dir, "rounds", "1", "review.jsonl");
        const hasFix = existsSync(firstFile);
        if (hasFix) jobsWithFix.add(dir);
        const readSide = (path: string) => {
            const last = new Map<string, Challenge>();
            for (const line of jsonLines(path)) {
                if (line.__bad !== undefined) {
                    badLines += 1;
                    continue;
                }
                if (typeof line.finding === "string" && typeof line.verdict === "string") {
                    last.set(line.finding, {
                        verdict: line.verdict,
                        explanation: String(line.explanation ?? ""),
                        evidence: line.evidence ?? [],
                    });
                }
            }
            return last;
        };
        const final = readSide(file);
        const first = hasFix ? readSide(firstFile) : new Map<string, Challenge>();
        for (const [id, challenge] of final) {
            const entry = challenges.get(id) ?? {};
            entry.final = challenge;
            challenges.set(id, entry);
        }
        for (const [id, challenge] of first) {
            const entry = challenges.get(id) ?? {};
            entry.first = challenge;
            challenges.set(id, entry);
        }
        const seen = new Map<string, Missed>();
        for (const line of jsonLines(file)) {
            if (line.__bad === undefined && typeof line.says === "string" && line.finding === undefined) {
                seen.set(String(line.id), {
                    stage,
                    says: line.says,
                    evidence: line.evidence ?? [],
                    concerns: line.concerns,
                });
            }
        }
        missed.push(...seen.values());
    }
    const labelOf = (id: string): { label: Label; challenge?: Challenge } => {
        const entry = challenges.get(id);
        if (entry?.final) return { label: "disputed", challenge: entry.final };
        if (entry?.first) return { label: "corrected", challenge: entry.first };
        return { label: "reviewed" };
    };
    const dropped = [...challenges.entries()].filter(([id]) => !records.has(id));

    // ---- source text
    const fileRows = new Map(
        rows<{ path: string; readFrom: string | null }>("select path,readFrom from file").map((f) => [f.path, f]),
    );
    const sourceCache = new Map<string, string[] | undefined>();
    const sourceLines = (file: string): string[] | undefined => {
        if (sourceCache.has(file)) return sourceCache.get(file);
        const row = fileRows.get(file);
        const path = row?.readFrom ? join(root, row.readFrom) : join(source, file);
        let lines: string[] | undefined;
        if (existsSync(path)) {
            lines = readFileSync(path, "utf8").split("\n").map((l) => l.replace(/\r$/, ""));
        }
        sourceCache.set(file, lines);
        return lines;
    };

    // ---- names
    const nameOf = (id: string): string => {
        const rec = records.get(id);
        return rec?.body?.name ?? rec?.body?.writtenAs ?? id;
    };

    return {
        root,
        db,
        records,
        byNumber,
        of,
        rows,
        aspects,
        riskCategories,
        severities,
        confirmWith,
        partKinds,
        challenges,
        missed,
        dropped,
        labelOf,
        reviewFiles,
        badLines,
        jobsWithFix: jobsWithFix.size,
        sourceLines,
        nameOf,
    };
}
