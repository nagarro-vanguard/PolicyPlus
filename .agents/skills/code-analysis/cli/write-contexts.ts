#!/usr/bin/env bun
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CONTEXT_LABELS as L } from "../shared/read/context-labels";
import { render, sectionsOfContext, sourceOf, type Entry } from "../shared/read/context-files";

// Writes the texts a reader copies, one file per node, from the written payloads: the system, each area, each
// capability, each screen, each entry point, each rule, and the risks as one list. An index says which record each file
// is about. Deterministic, no agent.

const args = process.argv.slice(2);
const flag = (name: string) => {
    const at = args.indexOf(name);
    return at < 0 ? undefined : args[at + 1];
};
const payloads = flag("--payloads");
const out = flag("--out");
if (args.includes("--help") || payloads === undefined || out === undefined) {
    console.log(
        "Usage: write-contexts.ts --payloads <payloads dir> --out <contexts dir>\n\nWrites one text per node and an index.json that names the record each is about.",
    );
    process.exit(payloads === undefined || out === undefined ? 2 : 0);
}

const read = (path: string) => JSON.parse(readFileSync(path, "utf8")) as any;
const system = read(join(payloads, "system.json"));
const capabilities = readdirSync(payloads)
    .filter((file) => file.startsWith("capability-") && file.endsWith(".json"))
    .sort()
    .map((file) => read(join(payloads, file)));
const knowledge = read(join(payloads, "knowledge.json"));
let roots: string[] = [];
try {
    roots = read(resolve(payloads, "..", "work", "analysis-request.json")).sourceRoots ?? [];
} catch {
    roots = [];
}
const source = sourceOf(roots);

const entries: Entry[] = [];
let count = 0;
const put = (kind: string, keys: Record<string, string>, text: string) => {
    const file = `${kind}/${String(++count).padStart(5, "0")}.md`;
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), text);
    entries.push({ kind, keys, file });
};

const placeLine = (place: { file: string; firstLine: number; lastLine: number }) =>
    `${place.file}:${place.firstLine}-${place.lastLine}`;

put(
    "system",
    { id: "overview" },
    render({
        ...sectionsOfContext(system.context, {
            holds: [],
        }),
        whereToLook: [L.analysedAt(system.repository ?? system.name, String(system.commit ?? "").slice(0, 8)), ...system.context.lookFirst],
    }),
);
for (const area of system.areas) put("area", { id: area.id }, render(sectionsOfContext(area.context)));

const rulesById = new Map<string, any>();
const actionsOfRule = new Map<string, any[]>();
for (const capability of capabilities) {
    for (const layer of capability.layers) {
        for (const rule of layer.rules) rulesById.set(rule.id, rule);
        for (const action of layer.actions)
            for (const id of action.rules ?? []) actionsOfRule.set(id, [...(actionsOfRule.get(id) ?? []), action]);
    }
}

for (const capability of capabilities) {
    put("capability", { id: capability.capability.id }, render(sectionsOfContext(capability.context)));
    const surfaceOf = new Map<string, string>();
    for (const layer of capability.layers)
        for (const action of layer.actions) if (action.screen && action.surface) surfaceOf.set(action.screen, action.surface);
    for (const screen of capability.screens) {
        const surface = surfaceOf.get(screen.name);
        if (surface !== undefined)
            put("surface", { capability: capability.capability.id, surface }, render(sectionsOfContext(screen.context)));
    }
    for (const layer of capability.layers)
        for (const action of layer.actions)
            put("action", { id: action.id }, render(sectionsOfContext(action.context)));
}
for (const [id, rule] of rulesById) {
    const reachers = (actionsOfRule.get(id) ?? []).map(
        (action) => `${action.name}${action.purpose === "" ? "" : `: ${action.purpose}`} (${placeLine(action.place)})`,
    );
    put(
        "rule",
        { id },
        render({
            whatItIs: rule.says,
            rules: rule.gates ? [L.gates] : [],
            usedBy: reachers,
            evidence: [rule.place, ...(rule.alsoRestsOn ?? [])].flatMap((place: any) => source.excerpt(place)),
            unsure: rule.context.unconfirmed.length === 0 ? [] : [L.doubt, ...rule.context.unconfirmed.map((line: string) => `- ${line}`)],
            whereToLook: [placeLine(rule.place), ...(rule.alsoRestsOn ?? []).map(placeLine)],
        }),
    );
}
for (const rule of system.rulesInNoCapability?.rules ?? []) {
    if (rulesById.has(rule.id)) continue;
    const place = { file: rule.file, firstLine: rule.firstLine, lastLine: rule.firstLine };
    put(
        "rule",
        { id: rule.id },
        render({
            whatItIs: rule.says,
            evidence: source.excerpt(place),
            whereToLook: [placeLine(place)],
        }),
    );
}
try {
    const registry = read(resolve(payloads, "..", "personas.json")).personas as { name: string; means: string; evidence: any[] }[];
    for (const persona of registry)
        put(
            "persona",
            { name: persona.name },
            render({
                whatItIs: `${persona.name}: ${persona.means}`,
                evidence: persona.evidence.flatMap((place) => source.excerpt(place)),
                whereToLook: persona.evidence.map(placeLine),
            }),
        );
} catch {
    // no persona registry was written for this analysis
}
put(
    "risks",
    { id: "risks" },
    render({
        whatItIs: `${knowledge.risks.length} risks the analysis found in ${system.name}, worst first.`,
        holds: knowledge.risks.map(
            (risk: any) =>
                `${risk.severity}: ${risk.statement} (${risk.categoryWords}${risk.subject.kind === "system" ? "" : `; ${risk.subject.name}`})`,
        ),
    }),
);
writeFileSync(join(out, "index.json"), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`${entries.length} contexts written to ${out}`);
