/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */
/**
 * Builds the HTML pages of a finished code-analysis run from its store, with the page-components design system.
 * Usage: bun render.tsx --root <analysis root> --source <analysed code folder> --out <output folder>
 * It reads the run and writes only to the output folder.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import {
    Callout,
    CodeBlock,
    CopyButton,
    DataTable,
    Disclosure,
    FactCard,
    Fragment,
    FlowDiagram,
    OnThisPage,
    Page,
    PageHeader,
    PlainWords,
    RegisterRow,
    RiskMap,
    RunOverview,
    Section,
    StagePage,
    StatusBadge,
    SummaryStrip,
    TopicBlock,
    assetFiles,
    assetsFor,
    counted,
    documentText,
    jsx,
    madeOn,
    visibleText,
    type Child,
    type Html,
    type Mark,
    type Standing,
} from "../page-components";
import { openRun, stageOrder, stageTitle, type Label, type Lines, type Rec, type StageKey } from "./data";

// ---------------------------------------------------------------- arguments
const arg = (name: string) => {
    const at = process.argv.indexOf(`--${name}`);
    const value = at === -1 ? undefined : process.argv[at + 1];
    if (value === undefined) throw new Error(`missing --${name}`);
    return value;
};
const root = arg("root");
const source = arg("source");
const out = arg("out");
const skill = join(import.meta.dir, "..", "..", "skills", "code-analysis");
const run = openRun(root, source, skill);
const madeAt = new Date().toISOString();

// ---------------------------------------------------------------- the ledger and the pages
const pages = new Map<string, string>();
const ledger = new Map<string, Map<string, string>>(); // type -> record id -> first page that shows it
const place = (type: string, id: string, page: string) => {
    const types = ledger.get(type) ?? new Map<string, string>();
    ledger.set(type, types);
    if (!types.has(id)) types.set(id, page);
};
const emit = (path: string, page: Html) => {
    if (pages.has(path)) throw new Error(`page written twice: ${path}`);
    pages.set(path, documentText(page));
};

const link = (from: string, to: string, anchor?: string) => {
    if (typeof to !== "string") throw new Error(`link from ${from} to nothing (anchor ${anchor})`);
    const relative = posix.relative(posix.dirname(from), to) || posix.basename(to);
    return anchor === undefined ? relative : `${relative}#${anchor}`;
};

const slugs = new Set<string>();
const slugOf = (name: string, id: string) => {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
    let slug = base === "" ? "page" : base;
    if (slugs.has(slug)) slug = `${slug}-${id.slice(-5)}`;
    slugs.add(slug);
    return slug;
};

// ---------------------------------------------------------------- records
const parts = run.of("SystemPart");
const capabilities = run.of("Capability");
const entities = run.of("Entity");
const facts = run.of("Fact");
const rules = run.of("BusinessRule");
const lifecycles = run.of("Lifecycle");
const transitions = run.of("Transition");
const groups = run.of("CapabilityGroup");
const technologies = run.of("Technology");
const externals = run.of("ExternalSystem");
const definitions = run.of("DataDefinition");
const codeKinds = run.of("CodeKind");
const layers = run.of("Layer");
const blocks = run.of("Block");
const links = run.of("Link");
const entryAssignments = run.of("EntryPointAssignment");
const resourceAssignments = run.of("ResourceAssignment");
const shapeAssignments = run.of("ShapeAssignment");

const partPage = new Map(parts.map((p) => [p.id, `parts/${slugOf(p.body.name, p.id)}.html`]));
const capPage = new Map(capabilities.map((c) => [c.id, `capabilities/${slugOf(c.body.name, c.id)}.html`]));
const entPage = new Map(entities.map((e) => [e.id, `kinds-of-data/${slugOf(e.body.name, e.id)}.html`]));
const codeMapPage = new Map(parts.map((p) => [p.id, `code-map/${slugOf(p.body.name, p.id)}.html`]));

const nameOf = (id: string): string => {
    const rec = run.records.get(id);
    if (rec === undefined) return "an item no longer in the analysis";
    const name = run.nameOf(id) as string;
    return name === id ? `a ${rec.type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()}` : name;
};
const plural = (n: number, one: string, many = `${one}s`) => counted(n, one, many);
const num = (n: number) => n.toLocaleString("en-GB");
const fileLines = (l: Lines) => (l.firstLine === l.lastLine ? `${l.file} line ${l.firstLine}` : `${l.file} lines ${l.firstLine}–${l.lastLine}`);

// views
const blockCaps = new Map<string, string[]>();
for (const r of run.rows<{ block: string; capability: string }>("select block,capability from v_block_capabilities")) {
    const list = blockCaps.get(r.block) ?? [];
    list.push(r.capability);
    blockCaps.set(r.block, list);
}
const ruleBlock = new Map(run.rows<{ rule: string; block: string }>("select rule,block from v_rule").map((r) => [r.rule, r.block]));
const ruleGates = new Map<string, string[]>();
for (const r of run.rows<{ rule: string; transition: string }>("select rule,transition from v_rule_gates")) {
    const list = ruleGates.get(r.rule) ?? [];
    list.push(r.transition);
    ruleGates.set(r.rule, list);
}
const ruleCaps = (ruleId: string) => [...new Set(blockCaps.get(ruleBlock.get(ruleId) ?? "") ?? [])];
const lifecycleOf = new Map(lifecycles.map((l) => [l.body.entity as string, l]));
const resourceRows = new Map(
    run
        .rows<{ id: string; externalSystem: number; resource: string }>("select id,externalSystem,resource from resource")
        .map((r) => [r.id, r]),
);
const partOfBlock = new Map(run.rows<{ part: string; block: string }>("select part,block from v_part_blocks").map((r) => [r.block, r.part]));

// ---------------------------------------------------------------- evidence collector
type Cite = { lines: Lines; label: string; page: string; anchor: string };
const cites = new Map<string, Cite[]>();
const cite = (lines: Lines | undefined, label: string, page: string, anchor: string) => {
    if (lines === undefined || lines.file === undefined) return;
    const list = cites.get(lines.file) ?? [];
    list.push({ lines, label, page, anchor });
    cites.set(lines.file, list);
};
const fileSlugs = new Map<string, string>();
const evidencePage = (file: string) => {
    let slug = fileSlugs.get(file);
    if (slug === undefined) {
        slug = `evidence/${slugOf(file, file)}.html`;
        fileSlugs.set(file, slug);
    }
    return slug;
};

const numbered = (file: string, first: number, last: number, cap = Number.POSITIVE_INFINITY) => {
    const all = run.sourceLines(file);
    if (all === undefined) return undefined;
    const end = Math.min(last, first + cap - 1, all.length);
    const width = String(end).length;
    const body: string[] = [];
    for (let n = first; n <= end; n += 1) body.push(`${String(n).padStart(width, " ")}  ${all[n - 1] ?? ""}`);
    if (end < last) body.push(`… ${last - end} more lines, see the evidence page`);
    return body.join("\n");
};

// ---------------------------------------------------------------- page shell
const shell = (
    path: string,
    o: {
        eyebrow: string;
        title: string;
        lede: string;
        sections?: readonly { id: string; label: string }[];
        status?: { status: "pass" | "fail" | "warn" | "info" | "neutral"; label: string };
        meta?: Child;
        children?: Child;
    },
) => (
    <Page
        title={`${o.title} · Policy Plus analysis`}
        assets={assetsFor(path)}
        generatedAt={madeOn(madeAt)}
        header={<PageHeader eyebrow={o.eyebrow} title={o.title} lede={o.lede} status={o.status} meta={o.meta ?? navLinks(path)} />}
        contents={o.sections && o.sections.length > 1 ? <OnThisPage items={o.sections.map((s) => ({ href: `#${s.id}`, label: s.label }))} /> : undefined}
    >
        {o.children}
    </Page>
);
const navLinks = (path: string) => (
    <>
        <p class="meta">
            <a href={link(path, "index.html")}>Map</a> · <a href={link(path, "capabilities.html")}>Capabilities</a> ·{" "}
            <a href={link(path, "kinds-of-data.html")}>Kinds of data</a> · <a href={link(path, "interfaces.html")}>Interfaces</a> ·{" "}
            <a href={link(path, "code-index.html")}>Code index</a> · <a href={link(path, "findings.html")}>Findings</a> ·{" "}
            <a href={link(path, "assumptions.html")}>Assumptions</a> · <a href={link(path, "risks.html")}>Risks</a> ·{" "}
            <a href={link(path, "system.html")}>System</a> · <a href={link(path, "parts.html")}>Parts</a> ·{" "}
            <a href={link(path, "run.html")}>How it was analysed</a>
        </p>
        <p>
            <input type="search" id="q" class="search" placeholder="Search capabilities, data, pages, findings, rules" aria-label="Search the analysis" autocomplete="off" />
        </p>
        <ol id="q-results" class="search-results" role="list"></ol>
    </>
);

// ---------------------------------------------------------------- marks
const labelMark = (label: Label): Mark =>
    label === "reviewed"
        ? { status: "pass", label: "reviewed, no challenge" }
        : label === "corrected"
          ? { status: "info", label: "corrected after review" }
          : { status: "warn", label: "disputed: a challenge still stands" };
const severityStatus = (s: string): Mark["status"] => (s === "high" ? "fail" : s === "medium" ? "warn" : "info");
const basisOf = (f: Rec) => Object.keys(f.body.basis)[0] as "observed" | "assumed" | "concluded";
const standingOf = (f: Rec): Mark => {
    const basis = basisOf(f);
    return basis === "observed"
        ? { status: "pass", label: "shown by the code" }
        : basis === "assumed"
          ? { status: "warn", label: "assumed" }
          : { status: "info", label: "concluded from other facts" };
};
const evidenceOf = (f: Rec): { lines: Lines; shows: string }[] => f.body.basis[basisOf(f)]?.evidence ?? [];
const sid = (f: Rec): string => (typeof f.body.subject === "string" ? f.body.subject : f.body.subject.key);
const subjectLabel = (f: Rec) => {
    const aspect = run.aspects.get(f.body.aspect)?.words ?? f.body.aspect;
    const who = sid(f) === "system" ? "The whole system" : nameOf(sid(f));
    return `${who} › ${aspect}`;
};
const riskMark = (f: Rec): Mark | undefined => {
    const risk = f.body.risk;
    if (risk === undefined) return undefined;
    const words = run.riskCategories.get(risk.category)?.words ?? risk.category;
    return { status: severityStatus(risk.severity), label: `${risk.severity} risk: ${words}` };
};

const reviewNote = (id: string) => {
    const { label, challenge } = run.labelOf(id);
    return (
        <div class="review-note">
            <StatusBadge status={labelMark(label).status} label={labelMark(label).label} />
            {challenge !== undefined && label !== "reviewed" && (
                <Disclosure title={label === "disputed" ? "The reviewer's challenge, still standing" : "The challenge that was fixed"}>
                    <p>
                        <strong>{challenge.verdict}</strong>: {plain(challenge.explanation)}
                    </p>
                    {challenge.evidence.length > 0 && (
                        <ul>
                            {challenge.evidence.slice(0, 8).map((e) => (
                                <li>{fileLines(e)}</li>
                            ))}
                        </ul>
                    )}
                </Disclosure>
            )}
        </div>
    );
};

// ---------------------------------------------------------------- fact cards
const factHome = (f: Rec) => "findings.html";
const factCard = (f: Rec, path: string, withCode: boolean, idx = 0): Html => {
    const basis = basisOf(f);
    const body = f.body.basis[basis];
    const shows: string[] = [];
    if (basis === "assumed") {
        shows.push(plain(`Why it is only assumed: ${body.why}`));
        const confirm = run.confirmWith.get(body.confirmWith)?.words;
        if (confirm) shows.push(`Confirm with: ${confirm}`);
        shows.push(plain(`If it is wrong: ${body.ifWrong}`));
    }
    if (basis === "concluded") shows.push(`Rests on ${plural(body.from.length, "other fact")}`);
    for (const e of evidenceOf(f)) shows.push(plain(`${e.shows} (${fileLines(e.lines)})`));
    const files = [...new Set(evidenceOf(f).map((e) => e.lines.file))];
    const from =
        basis === "concluded"
            ? `${plural(body.from.length, "fact")} beneath it`
            : `${plural(evidenceOf(f).length, "place")} in the code${files.length ? `: ${files.slice(0, 3).join(", ")}${files.length > 3 ? ", …" : ""}` : ""}`;
    place("Fact", f.id, path);
    return (
        <div class="fact-wrap">
            <FactCard
                id={f.id}
                subject={subjectLabel(f)}
                statement={plain(f.body.statement)}
                standing={standingOf(f)}
                risk={riskMark(f)}
                from={from}
                shows={shows}
                context={factContext(f)}
                isNew={false}
            />
            {reviewNote(f.id)}
            {withCode ? sourceBlocks(f, idx) : <p class="meta"><a href={link(path, "findings.html", f.id)}>Source lines for this finding</a></p>}
            {basis === "concluded" && (
                <Disclosure title={`The facts this rests on (${body.from.length})`}>
                    <ul>
                        {body.from.map((id: string) => {
                            const under = run.records.get(id);
                            return (
                                <li>
                                    <a href={link(path, "findings.html", id)}>{plain(under?.body.statement ?? "(a fact no longer in the analysis)")}</a>
                                </li>
                            );
                        })}
                    </ul>
                </Disclosure>
            )}
        </div>
    );
};
const sourceBlocks = (f: Rec, idx: number): Child => {
    const list = evidenceOf(f);
    if (list.length === 0) return undefined;
    return (
        <Disclosure title={`Source lines (${list.length})`}>
            {list.slice(0, 8).map((e, i) => {
                const text = numbered(e.lines.file, e.lines.firstLine, e.lines.lastLine, 40);
                return text === undefined ? (
                    <p class="meta">{`${fileLines(e.lines)}: the file could not be read from the source folder.`}</p>
                ) : (
                    <CodeBlock id={`src-${idx}-${i}`} title={`${fileLines(e.lines)}: ${e.shows}`} code={text} />
                );
            })}
            {list.length > 8 && <p class="meta">{`${list.length - 8} more evidence lines: see the evidence pages for the files.`}</p>}
        </Disclosure>
    );
};

// ---------------------------------------------------------------- rule cards
const stateName = (lifecycleId: string, index: number) => run.records.get(lifecycleId)?.body.states?.[index]?.name ?? `state ${index}`;
const gateText = (transitionId: string) => {
    const t = run.records.get(transitionId);
    if (t === undefined) return undefined;
    const life = run.records.get(t.body.lifecycle);
    const from = Array.isArray(t.body.fromStates) ? (t.body.fromStates as number[]).map((i) => stateName(t.body.lifecycle, i)).join(" or ") : `a new record (${t.body.fromStates})`;
    return `${nameOf(life?.body.entity)}: from ${from} to ${stateName(t.body.lifecycle, t.body.to)}`;
};
const idWords = /\b(?:[a-z]+)-(?:\d{20}|[0-9a-f]{12})\b/g;
/**
 * Text with every record id replaced by what the record is called, so no page shows an id.
 * @param text the text
 * @returns the text in plain words
 */
const plain = (text: string): string =>
    text.replace(idWords, (id) => {
        const rec = run.records.get(id);
        if (rec === undefined) return "an item no longer in the analysis";
        if (rec.type === "Fact") return "another finding";
        if (rec.type === "BusinessRule") return "another rule";
        if (rec.type === "Transition") return `the change (${gateText(id) ?? "of state"})`;
        if (rec.type === "Lifecycle") return `the life of ${nameOf(rec.body.entity)}`;
        if (rec.type === "Block") return `the code at ${fileLines(rec.body.lines)}`;
        return nameOf(id);
    });
const ruleCard = (r: Rec, path: string, where: string, idx: number): Html => {
    const { label } = run.labelOf(r.id);
    const at = r.body.decidedAt as Lines;
    place("BusinessRule", r.id, path);
    const gates = (ruleGates.get(r.id) ?? []).map(gateText).filter((t): t is string => t !== undefined);
    const code = numbered(at.file, at.firstLine, at.lastLine, 25);
    return (
        <div class="fact-wrap">
            <FactCard
                id={r.id}
                subject={`${where} › Business rule`}
                statement={plain(r.body.says)}
                standing={labelMark(label)}
                from={fileLines(at)}
                shows={[`Decided at ${fileLines(at)}`, ...gates.map((g) => `Gates a change of state — ${g}`)]}
                context={ruleContext(r, where)}
                isNew={false}
            />
            {label === "disputed" && reviewNote(r.id)}
            {code !== undefined && (
                <Disclosure title="Source lines">
                    <CodeBlock id={`rule-${idx}`} title={fileLines(at)} code={code} />
                </Disclosure>
            )}
        </div>
    );
};


// ================================================================ context to copy
// One markdown document per finding, for an engineer or a coding agent: the finding, where to look first (each
// evidence range with the entry point that reaches it, what it saves and reads, and the rules decided there), and where
// it sits. Built only from the store; never shows a record id.
const gitOut = (args: string[]) => {
    const r = Bun.spawnSync(["git", "-C", source, ...args]);
    return r.success ? r.stdout.toString().trim() : "";
};
const commit = gitOut(["rev-parse", "--short=12", "HEAD"]);
const dirty = gitOut(["status", "--porcelain", "--untracked-files=no"]) !== "";
const repoNote = commit === "" ? "" : `> Repository: ${source.split("/").pop()} at commit ${commit}${dirty ? " (with changes outside that commit)" : ""}\n>\n> Each path below is within its repository.\n\n`;
const md = (text: string) => plain(text).replace(/[\\<>_[\]&]/g, (m) => `\\${m}`);
const range = (l: Lines) => `\`${l.file}:${l.firstLine}-${l.lastLine}\``;

const ctxBlocksByFile = new Map<string, Rec[]>();
for (const b of blocks) ctxBlocksByFile.set(b.body.lines.file, [...(ctxBlocksByFile.get(b.body.lines.file) ?? []), b]);
const blockHolding = (l: Lines): Rec | undefined => {
    const inside = (ctxBlocksByFile.get(l.file) ?? []).filter((b) => b.body.lines.firstLine <= l.firstLine && l.firstLine <= b.body.lines.lastLine);
    return inside.sort((a, b) => a.body.lines.lastLine - a.body.lines.firstLine - (b.body.lines.lastLine - b.body.lines.firstLine))[0];
};
const entriesReaching = new Map<string, string[]>();
for (const r of run.rows<{ entryPoint: string; block: string }>("select entryPoint,block from v_entry_point_blocks")) {
    const list = entriesReaching.get(r.block) ?? [];
    list.push(r.entryPoint);
    entriesReaching.set(r.block, list);
}
const entryCapability = new Map(run.rows<{ entryPoint: string; capability: string | null }>("select entryPoint,capability from v_entry_point").map((r) => [r.entryPoint, r.capability]));
const accessOfBlock = new Map<string, { saves: Set<string>; reads: Set<string> }>();
for (const r of run.rows<{ entity: string; block: string; kind: string }>("select entity,block,kind from v_entity_access")) {
    const a = accessOfBlock.get(r.block) ?? { saves: new Set<string>(), reads: new Set<string>() };
    (r.kind === "saves" ? a.saves : a.reads).add(nameOf(r.entity));
    accessOfBlock.set(r.block, a);
}
const rulesOfBlock = new Map<string, string[]>();
for (const r of run.rows<{ block: string; rule: string }>("select block,rule from v_block_rules")) {
    rulesOfBlock.set(r.block, [...(rulesOfBlock.get(r.block) ?? []), r.rule]);
}
const areaOf = (cap: string) => groups.find((g) => (g.body.capabilities as string[]).includes(cap))?.body.name as string | undefined;
const startedWords: Record<string, string> = { person: "started by a person", schedule: "started on a schedule", system: "started by another system", code: "started by other code" };

type EpRow = { id: string; name: string; startedBy: string; reachedBy: string; purpose: string; file: string; firstLine: number; lastLine: number; capability: string | null };
const epRows = run.rows<EpRow>("select entryPoint as id,name,startedBy,reachedBy,purpose,file,firstLine,lastLine,capability from v_entry_point");
const epById = new Map(epRows.map((e) => [e.id, e]));
const savesByBlock = new Map<string, Set<string>>();
const readsByBlock = new Map<string, Set<string>>();
for (const r of run.rows<{ entity: string; block: string; kind: string }>("select entity,block,kind from v_entity_access")) {
    const m = r.kind === "saves" ? savesByBlock : readsByBlock;
    const set = m.get(r.block) ?? new Set<string>();
    set.add(r.entity);
    m.set(r.block, set);
}
const reachBlocks = new Map<string, string[]>();
for (const r of run.rows<{ entryPoint: string; block: string }>("select entryPoint,block from v_entry_point_blocks")) {
    const list = reachBlocks.get(r.entryPoint) ?? [];
    list.push(r.block);
    reachBlocks.set(r.entryPoint, list);
}
const changesCache = new Map<string, Set<string>>();
/** The kinds of data an entry point can change: everything saved in the code it reaches, and in its own block. */
const changesOf = (ep: string): Set<string> => {
    let set = changesCache.get(ep);
    if (set === undefined) {
        set = new Set<string>(savesByBlock.get(ep) ?? []);
        for (const b of reachBlocks.get(ep) ?? []) for (const e of savesByBlock.get(b) ?? []) set.add(e);
        changesCache.set(ep, set);
    }
    return set;
};
const startedShort = (by: string) => (by === "person" ? "a person" : by === "otherSystem" ? "another system" : by === "schedule" ? "a schedule" : by);
const changesWords = (ep: string) => {
    const ch = [...changesOf(ep)].map(nameOf);
    return ch.length === 0 ? "" : `changes data (${ch.slice(0, 3).join(", ")}${ch.length > 3 ? ", …" : ""})`;
};
const epLine = (e: EpRow) =>
    `${range({ file: e.file, firstLine: e.firstLine, lastLine: e.lastLine })}: ${md(e.reachedBy)}, started by ${startedShort(e.startedBy)}${changesOf(e.id).size ? `; ${changesWords(e.id)}` : ""}${e.capability ? ` (${md(nameOf(e.capability))})` : ""}`;
const codeFile = /\.(vb|cs|aspx|ascx|ashx|asmx|svc|asp|vbs|js|master|asax)$/i;

/** The lines of one place to look: its range, what it shows, and what the code there is part of. */
const lookAt = (l: Lines, shows?: string): string[] => {
    const out = [`- ${range(l)}${shows ? `: ${md(shows)}` : ""}`];
    const b = blockHolding(l);
    if (b === undefined) {
        out.push(codeFile.test(l.file) ? "  - No entry point: no mapped block of code holds these lines" : "  - No entry point: configuration, script or document");
        return out;
    }
    const own = b.body.entryPoint !== undefined ? epById.get(b.id) : undefined;
    if (own !== undefined) {
        out.push(`  - Entry point: ${epLine(own)}`);
    } else {
        const reached = [...new Set(entriesReaching.get(b.id) ?? [])].map((id) => epById.get(id)).filter((e): e is EpRow => e !== undefined);
        if (reached.length === 0) out.push("  - Not reached from a known entry point (the map follows links up to three deep)");
        else if (reached.length === 1) out.push(`  - Reached from 1 entry point: ${epLine(reached[0] as EpRow)}`);
        else {
            const homeCaps = new Set(blockCaps.get(b.id) ?? []);
            const rank = (e: EpRow) => (changesOf(e.id).size > 0 ? 0 : 2) + (e.capability !== null && homeCaps.has(e.capability) ? 0 : 1);
            const best = [...reached].sort((x, y) => rank(x) - rank(y) || (x.file < y.file ? -1 : 1)).slice(0, 3);
            const examples = best.map((e) => `${range({ file: e.file, firstLine: e.firstLine, lastLine: e.lastLine })} (${startedShort(e.startedBy)}${changesOf(e.id).size ? "; changes data" : ""})`);
            out.push(`  - Reached from ${reached.length} entry points, for example ${examples.join("; ")}${reached.length > 3 ? `; and ${reached.length - 3} more` : ""}`);
        }
        const caps = [...new Set(blockCaps.get(b.id) ?? [])];
        if (caps.length > 0) out.push(`  - Belongs to: ${caps.slice(0, 3).map((c) => md(nameOf(c))).join(", ")}${caps.length > 3 ? `, and ${caps.length - 3} more` : ""}`);
    }
    const access = accessOfBlock.get(b.id);
    if (access && (access.saves.size > 0 || access.reads.size > 0)) {
        out.push(`  - Data: ${[access.saves.size ? `saves ${[...access.saves].join(", ")}` : "", access.reads.size ? `reads ${[...access.reads].join(", ")}` : ""].filter(Boolean).join("; ")}`);
    }
    const ruleIds = rulesOfBlock.get(b.id) ?? [];
    if (ruleIds.length > 0) {
        const texts = ruleIds.slice(0, 3).map((id) => md(run.records.get(id)?.body.says ?? ""));
        out.push(`  - Rules decided here: ${ruleIds.length} (${texts.join("; ")}${ruleIds.length > 3 ? "; …" : ""})`);
    }
    return out;
};
const sitsIn = (id: string): string[] => {
    const rec = run.records.get(id);
    if (rec === undefined) return [];
    if (rec.type === "SystemPart") return [`- Part: ${md(rec.body.name)} (${(rec.body.folders ?? []).map((f: string) => `\`${f}\``).join(", ")}), ${run.partKinds.get(rec.body.kind)?.words ?? rec.body.kind}`];
    if (rec.type === "Capability") return [`- Capability: ${md(rec.body.name)}${areaOf(id) ? `, in ${md(areaOf(id) as string)}` : ""}`];
    if (rec.type === "Entity") return [`- Kind of data: ${md(rec.body.name)}`];
    if (rec.type === "Technology") return [`- Technology: ${md(rec.body.name)} (${rec.body.kind})`];
    return [];
};
const section = (title: string, lines: string[]) => (lines.length === 0 ? "" : `## ${title}\n\n${lines.join("\n")}\n\n`);

const factContext = (f: Rec): string => {
    const basis = basisOf(f);
    const kindWord = basis === "assumed" ? "Assumption" : f.body.risk ? `${f.body.risk.severity[0].toUpperCase()}${f.body.risk.severity.slice(1)} risk` : "Fact";
    const subject = sid(f) === "system" ? "The whole system" : nameOf(sid(f));
    const body = f.body.basis[basis];
    const finding: string[] = [md(f.body.statement), ""];
    finding.push(`- Standing: ${standingOf(f).label}`);
    if (f.body.risk) finding.push(`- Risk: ${f.body.risk.severity}, ${md(run.riskCategories.get(f.body.risk.category)?.words ?? f.body.risk.category)}`);
    finding.push(`- Answers: ${md(run.aspects.get(f.body.aspect)?.words ?? f.body.aspect)}`);
    if (basis === "assumed") {
        finding.push(`- Why we assume it: ${md(body.why)}`);
        finding.push(`- Confirm with: ${run.confirmWith.get(body.confirmWith)?.words ?? body.confirmWith}`);
        finding.push(`- If wrong: ${md(body.ifWrong)}`);
        if (body.decides) finding.push(`- To decide: ${md(body.decides)}`);
    }
    let text = `# Context · ${kindWord} · ${md(subject)}\n\n${repoNote}`;
    text += `## The finding\n\n${finding.join("\n")}\n\n`;
    if (basis === "concluded") text += section("What it rests on", body.from.map((id: string) => `- ${md(run.records.get(id)?.body.statement ?? "a fact no longer in the analysis")}`));
    text += section("Where to look first", evidenceOf(f).flatMap((e) => lookAt(e.lines, e.shows)));
    text += section("Where it sits", sitsIn(sid(f)));
    return text.trimEnd() + "\n";
};
const ruleContext = (r: Rec, where: string): string => {
    const at = r.body.decidedAt as Lines;
    const gates = (ruleGates.get(r.id) ?? []).map(gateText).filter((t): t is string => t !== undefined);
    let text = `# Context · Business rule · ${md(where)}\n\n${repoNote}## The rule\n\n${md(r.body.says)}\n\n`;
    text += section("Where to look first", lookAt(at, "Where the code decides it"));
    text += section("What state change it gates", gates.map((g) => `- ${md(g)}`));
    const homes = ruleCaps(r.id);
    text += section("Where it sits", [...homes.slice(0, 5).flatMap((c) => sitsIn(c)), ...(homes.length > 5 ? [`- …and ${homes.length - 5} more capabilities that share this code`] : [])]);
    return text.trimEnd() + "\n";
};
const partContext = (p: Rec): string => {
    const tech = technologies.filter((t) => (t.body.uses ?? []).some((u: any) => (u.parts ?? []).includes(p.id))).map((t) => `- ${md(t.body.name)}`);
    let text = `# Context · Part · ${md(p.body.name)}\n\n${repoNote}## The finding\n\n${md(p.body.purpose)}\n\n- Kind: ${run.partKinds.get(p.body.kind)?.words ?? p.body.kind}\n\n`;
    text += section("Where to look first", (p.body.evidence ?? []).map((e: Lines) => `- ${range(e)}`));
    text += section("Built with", tech);
    text += section("Where it sits", [`- Folders: ${(p.body.folders ?? []).map((f: string) => `\`${f}\``).join(", ")}`]);
    return text.trimEnd() + "\n";
};
const capContext = (c: Rec): string => {
    const eps = entryAssignments.filter((a) => a.body.capability === c.id).map((a) => epById.get(a.body.entryPoint)).filter((e): e is EpRow => e !== undefined);
    const ordered = [...eps].sort((x, y) => (changesOf(y.id).size > 0 ? 1 : 0) - (changesOf(x.id).size > 0 ? 1 : 0) || (x.startedBy === "person" ? 1 : 0) - (y.startedBy === "person" ? 1 : 0) || (x.file < y.file ? -1 : 1));
    const pages = new Set(eps.map((e) => e.file)).size;
    const changing = eps.filter((e) => changesOf(e.id).size > 0).length;
    const lines = ordered.slice(0, 40).map((e) => `- ${epLine(e)}: ${md(e.purpose)}`);
    if (ordered.length > 40) lines.push(`- …and ${ordered.length - 40} more entry points`);
    const myRules = rules.filter((r) => ruleCaps(r.id).includes(c.id));
    const kinds = run.rows<{ entity: string }>(`select entity from v_capability_entities where capability='${c.id}'`).map((r) => `- ${md(nameOf(r.entity))}`);
    let text = `# Context · Capability · ${md(c.body.name)}\n\n${repoNote}## What it is for\n\n${md(c.body.purpose)}\n\n`;
    text += section("What belongs here", [md(c.body.membershipRule)]);
    text += section("Where it starts", eps.length === 0 ? [] : [`${plural(pages, "page")}, ${plural(eps.length, "entry point")}, ${changing} that change data (listed first)`, "", ...lines]);
    text += section("Kinds of data it keeps", kinds);
    text += section("Rules it applies", [...myRules.slice(0, 12).map((r) => `- ${range(r.body.decidedAt)}: ${md(r.body.says)}`), ...(myRules.length > 12 ? [`- …and ${myRules.length - 12} more rules`] : [])]);
    text += section("Where it sits", areaOf(c.id) ? [`- Area: ${md(areaOf(c.id) as string)}`] : []);
    return text.trimEnd() + "\n";
};
const entityContext = (e: Rec): string => {
    const life = lifecycleOf.get(e.id);
    const defs = run.rows<{ name: string; file: string; firstLine: number; lastLine: number }>(`select name,file,firstLine,lastLine from v_entity_definitions where entity='${e.id}'`);
    const storedAll = resourceAssignments.filter((r) => r.body.entity === e.id);
    const stored = storedAll.slice(0, 15).map((r) => {
        const row = resourceRows.get(r.body.resource);
        return `- ${md(row ? nameOf(run.byNumber.get(row.externalSystem) ?? "") : "")}: ${md(row?.resource ?? "")}`;
    });
    if (storedAll.length > 15) stored.push(`- …and ${storedAll.length - 15} more resources`);
    const savers = savingPlaces(e.id);
    const readers = [...readsByBlock.entries()].filter(([, set]) => set.has(e.id)).map(([b]) => b);
    const readerCaps = new Set(readers.flatMap((b) => blockCaps.get(b) ?? []));
    let text = `# Context · Kind of data · ${md(e.body.name)}\n\n${repoNote}## What it holds\n\n${md(e.body.purpose)}\n\n${md(e.body.membershipRule)}\n\n`;
    text += section("How it is written in the code", defs.map((d) => `- ${md(d.name)} (\`${d.file}:${d.firstLine}-${d.lastLine}\`)`));
    text += section("Where it is kept", stored);
    text += section("Changed by (the places in the code that save it)", [
        ...savers.slice(0, 15).map((p) => `- ${range(p.lines)}: ${md(p.what)} (${p.reached === 0 ? "not reached from a known entry point" : `reached from ${plural(p.reached, "entry point")}`}${p.caps.length ? `; ${p.caps.slice(0, 2).map((c) => md(nameOf(c))).join(", ")}${p.caps.length > 2 ? ", …" : ""}` : ""})`),
        ...(savers.length > 15 ? [`- …and ${savers.length - 15} more places`] : []),
    ]);
    text += section("Read by", readers.length === 0 ? [] : [`${plural(readers.length, "place")} in the code, in ${plural(readerCaps.size, "capability", "capabilities")}: ${[...readerCaps].slice(0, 6).map((c) => md(nameOf(c))).join(", ")}${readerCaps.size > 6 ? ", …" : ""}`]);
    if (life?.body.states) {
        text += section("How it changes state", [
            `State fields: ${(life.body.stateFields as string[]).join(", ")}`,
            "",
            ...(life.body.states as any[]).map((s, i) => `${i + 1}. ${md(s.name)}: ${md(s.writtenAs)}`),
            "",
            ...transitions.filter((t) => t.body.lifecycle === life.id).map((t) => `- ${md(gateText(t.id) ?? "")} (${range(t.body.writtenAt)})`),
        ]);
    } else if (life) text += section("How it changes state", [md(life.body.noStates)]);
    return text.trimEnd() + "\n";
};
/** The places in the code that save one kind of data, most widely reached first. */
const savingPlaces = (entity: string) => {
    const places: { block: string; lines: Lines; what: string; reached: number; caps: string[] }[] = [];
    for (const [b, set] of savesByBlock) {
        if (!set.has(entity)) continue;
        const rec = run.records.get(b);
        if (rec === undefined) continue;
        places.push({ block: b, lines: rec.body.lines as Lines, what: rec.body.writtenAs as string, reached: new Set(entriesReaching.get(b) ?? (rec.body.entryPoint ? [b] : [])).size || (rec.body.entryPoint ? 1 : 0), caps: [...new Set(blockCaps.get(b) ?? [])] });
    }
    return places.sort((x, y) => y.reached - x.reached || (x.lines.file < y.lines.file ? -1 : 1));
};
const copyHere = (text: string) => (
    <p>
        <CopyButton text={text} label="Copy context for an engineer or coding agent" />
    </p>
);

// ================================================================ lean data (map, capability and entity pages)
const SPINE_MIN = 20;
const touchCaps = new Map<string, Set<string>>();
const saverCaps = new Map<string, Map<string, number>>();
const touch = (entity: string, cap: string) => touchCaps.set(entity, (touchCaps.get(entity) ?? new Set<string>()).add(cap));
for (const [b, set] of savesByBlock) {
    for (const cap of new Set(blockCaps.get(b) ?? [])) {
        for (const e of set) {
            touch(e, cap);
            const m = saverCaps.get(e) ?? new Map<string, number>();
            m.set(cap, (m.get(cap) ?? 0) + 1);
            saverCaps.set(e, m);
        }
    }
}
for (const [b, set] of readsByBlock) for (const cap of new Set(blockCaps.get(b) ?? [])) for (const e of set) touch(e, cap);
const ownerOf = new Map<string, string>();
for (const [e, m] of saverCaps) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    const [cap, n] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] as [string, number];
    if (n / total >= 0.4) ownerOf.set(e, cap);
}
const spine = entities.filter((e) => (touchCaps.get(e.id)?.size ?? 0) >= SPINE_MIN).sort((a, b) => (touchCaps.get(b.id)?.size ?? 0) - (touchCaps.get(a.id)?.size ?? 0));
const spineIds = new Set(spine.map((e) => e.id));
const ownsOf = (cap: string) => entities.filter((e) => ownerOf.get(e.id) === cap);
const usesOf = (cap: string) => entities.filter((e) => touchCaps.get(e.id)?.has(cap) && ownerOf.get(e.id) !== cap);

const capRules = new Map<string, Rec[]>();
for (const r of rules) for (const c of ruleCaps(r.id)) capRules.set(c, [...(capRules.get(c) ?? []), r]);
const fileCaps = new Map<string, Set<string>>();
for (const b of blocks) for (const c of blockCaps.get(b.id) ?? []) fileCaps.set(b.body.lines.file, (fileCaps.get(b.body.lines.file) ?? new Set<string>()).add(c));
const riskFactsOfCap = new Map<string, Rec[]>();
for (const f of facts) {
    if (!f.body.risk) continue;
    const caps = new Set<string>();
    for (const e of evidenceOf(f)) for (const c of fileCaps.get(e.lines.file) ?? []) caps.add(c);
    if (run.records.get(sid(f))?.type === "Capability") caps.add(sid(f));
    for (const c of caps) riskFactsOfCap.set(c, [...(riskFactsOfCap.get(c) ?? []), f]);
}
const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
const bySeverity = (a: Rec, b: Rec) => sevRank[a.body.risk.severity] - sevRank[b.body.risk.severity];
const disputedOf = (cap: string) => (capRules.get(cap) ?? []).filter((r) => run.labelOf(r.id).label === "disputed");
const firstSentence = (t: string) => (t.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t).slice(0, 140);
const capRulesPage = new Map(capabilities.map((c) => [c.id, (capPage.get(c.id) as string).replace(/\.html$/, "-rules.html")]));
const capFindingsPage = new Map(capabilities.map((c) => [c.id, (capPage.get(c.id) as string).replace(/\.html$/, "-findings.html")]));
const epsOfCap = (cap: string) => entryAssignments.filter((a) => a.body.capability === cap).map((a) => epById.get(a.body.entryPoint)).filter((e): e is EpRow => e !== undefined);

// interfaces: entries not started by a person
type Interface = { group: string; e: EpRow };
const interfaceGroup = (e: EpRow) =>
    e.startedBy === "schedule"
        ? "Scheduled runs"
        : /Global\.asax$/.test(e.file)
          ? "Application start and stop events"
          : e.file.startsWith("Uploads/")
            ? "Install and upgrade scripts"
            : /\.(asmx|svc|ashx)$/i.test(e.file) || e.file.startsWith("App_Code") || /Callback/.test(e.file)
              ? "Service operations and callbacks from other systems"
              : "Page and script callbacks";
const interfaces: Interface[] = epRows.filter((e) => e.startedBy !== "person").map((e) => ({ group: interfaceGroup(e), e }));
const interfaceGroups = ["Service operations and callbacks from other systems", "Scheduled runs", "Application start and stop events", "Install and upgrade scripts", "Page and script callbacks"];

// code index: one row per page
type PageRow = { file: string; eps: EpRow[]; caps: Set<string>; changes: Set<string>; other: boolean };
const pageRows = new Map<string, PageRow>();
for (const e of epRows) {
    const row = pageRows.get(e.file) ?? { file: e.file, eps: [], caps: new Set<string>(), changes: new Set<string>(), other: false };
    row.eps.push(e);
    if (e.capability) row.caps.add(e.capability);
    for (const x of changesOf(e.id)) row.changes.add(x);
    if (e.startedBy !== "person") row.other = true;
    pageRows.set(e.file, row);
}
const rulesInFile = new Map<string, number>();
for (const r of rules) rulesInFile.set(r.body.decidedAt.file, (rulesInFile.get(r.body.decidedAt.file) ?? 0) + 1);
const factsInFile = new Map<string, number>();
for (const f of facts) for (const file of new Set(evidenceOf(f).map((e) => e.lines.file))) factsInFile.set(file, (factsInFile.get(file) ?? 0) + 1);
const codeMapOf = (epId: string) => codeMapPage.get(partOfBlock.get(epId) ?? "") ?? "code-map.html"; // a block outside every part (here version.bat) falls back to the index

// ================================================================ build pages
const factsOfSubject = (id: string) => facts.filter((f) => sid(f) === id);

// ---- findings.html: every fact, with its source lines
{
    const path = "findings.html";
    facts.forEach((f) => evidenceOf(f).forEach((e) => cite(e.lines, e.shows, path, f.id)));
    const groupsBy = new Map<string, Rec[]>();
    for (const f of facts) {
        const key = (sid(f) === "system" ? "system" : run.records.get(sid(f))?.type ?? "other") as string;
        groupsBy.set(key, [...(groupsBy.get(key) ?? []), f]);
    }
    const order: [string, string][] = [
        ["system", "The whole system"],
        ["SystemPart", "Parts"],
        ["Technology", "Technologies"],
        ["Capability", "Capabilities"],
        ["Entity", "Kinds of data"],
        ["other", "Other subjects"],
    ];
    let idx = 0;
    emit(
        path,
        shell(path, {
            eyebrow: "Every finding",
            title: "All findings and the evidence behind each",
            lede: `${num(facts.length)} facts, each with its basis, its risk and review result, and the source lines it rests on.`,
            sections: order.map(([k, label]) => ({ id: k, label })),
            children: (
                <>
                    <SummaryStrip
                        label="Findings by basis"
                        figures={[
                            { label: "Shown by the code", value: facts.filter((f) => basisOf(f) === "observed").length, status: "pass" },
                            { label: "Assumed", value: facts.filter((f) => basisOf(f) === "assumed").length, status: "warn" },
                            { label: "Concluded", value: facts.filter((f) => basisOf(f) === "concluded").length, status: "info" },
                            { label: "With a risk", value: facts.filter((f) => f.body.risk).length, status: "fail" },
                        ]}
                    />
                    {order.map(([key, label]) => (
                        <Section id={key} title={label} lede={`${plural((groupsBy.get(key) ?? []).length, "finding")}.`}>
                            {(groupsBy.get(key) ?? []).map((f) => factCard(f, path, true, idx++))}
                        </Section>
                    ))}
                </>
            ),
        }),
    );
}

// ---- parts, code map
const partFiles = new Map<string, Set<string>>();
for (const b of blocks) {
    const part = partOfBlock.get(b.id);
    if (part === undefined) continue;
    const set = partFiles.get(part) ?? new Set<string>();
    set.add(b.body.lines.file);
    partFiles.set(part, set);
}
// links by containing block
const blocksByFile = new Map<string, Rec[]>();
for (const b of blocks) blocksByFile.set(b.body.lines.file, [...(blocksByFile.get(b.body.lines.file) ?? []), b]);
const linksOfBlock = new Map<string, Rec[]>();
const strayLinks: Rec[] = [];
for (const l of links) {
    const at = l.body.lines as Lines;
    const inFile = blocksByFile.get(at.file) ?? [];
    const home = inFile.find((b) => b.body.lines.firstLine <= at.firstLine && at.lastLine <= b.body.lines.lastLine) ?? inFile.find((b) => b.body.lines.firstLine <= at.firstLine && at.firstLine <= b.body.lines.lastLine);
    if (home === undefined) strayLinks.push(l);
    else linksOfBlock.set(home.id, [...(linksOfBlock.get(home.id) ?? []), l]);
}
const toText = (to: any): string => {
    if (to?.file !== undefined) return `${to.file}${to.line !== undefined ? ` line ${to.line}` : ""}`;
    if (to?.resource !== undefined) return `${to.externalSystem ? nameOf(to.externalSystem) : "outside"} · ${to.resource}`;
    return JSON.stringify(to).slice(0, 80);
};
const kindWords: Record<string, string> = { call: "calls", reads: "reads", saves: "saves to", renders: "shows", request: "requests", leadsTo: "leads to" };
const linkLine = (l: Rec) => `${kindWords[l.body.kind] ?? l.body.kind} ${l.body.to === undefined ? `a target that is not resolved: ${l.body.unresolvedTarget ?? "no reason given"}` : toText(l.body.to)}`;

for (const part of parts) {
    const path = codeMapPage.get(part.id) as string;
    const mine = blocks.filter((b) => partOfBlock.get(b.id) === part.id).sort((a, b) => (a.body.lines.file === b.body.lines.file ? a.body.lines.firstLine - b.body.lines.firstLine : a.body.lines.file < b.body.lines.file ? -1 : 1));
    const byFile = new Map<string, Rec[]>();
    for (const b of mine) byFile.set(b.body.lines.file, [...(byFile.get(b.body.lines.file) ?? []), b]);
    for (const b of mine) place("Block", b.id, path);
    let linkTotal = 0;
    const sections = [...byFile.keys()].map((f, i) => ({ id: `file-${i}`, label: f }));
    emit(
        path,
        shell(path, {
            eyebrow: "Code map",
            title: `Code map: ${part.body.name}`,
            lede: `${plural(mine.length, "block")} of code in ${plural(byFile.size, "file")}, with what each calls, reads, saves and shows.`,
            sections: sections.length > 40 ? [] : sections,
            children: (
                <>
                    <p>
                        <a href={link(path, partPage.get(part.id) as string)}>Back to the part</a>
                    </p>
                    {[...byFile.entries()].map(([file, list], i) => (
                        <Section id={`file-${i}`} title={file} lede={`${plural(list.length, "block")}.`}>
                            <DataTable
                                caption={`Blocks of ${file}`}
                                columns={[
                                    { key: "lines", label: "Lines", rowHeader: true },
                                    { key: "what", label: "What it is" },
                                    { key: "who", label: "Capability" },
                                    { key: "links", label: "What it reaches" },
                                ]}
                                empty="No blocks."
                                rows={list.map((b) => {
                                    const l = linksOfBlock.get(b.id) ?? [];
                                    l.forEach((x) => place("Link", x.id, path));
                                    linkTotal += l.length;
                                    const caps = [...new Set(blockCaps.get(b.id) ?? [])];
                                    const ep = b.body.entryPoint;
                                    return {
                                        lines: <span id={b.id}>{`${b.body.lines.firstLine}–${b.body.lines.lastLine}`}</span>,
                                        what: (
                                            <>
                                                {b.body.writtenAs}
                                                {ep !== undefined && <><br /><StatusBadge status="info" label="entry point" /> {ep.purpose}</>}
                                            </>
                                        ),
                                        who: caps.length ? caps.map((c, k) => (<>{k > 0 && ", "}<a href={link(path, capPage.get(c) as string)}>{nameOf(c)}</a></>)) : "none",
                                        links: l.length === 0 ? "none" : (
                                            <Disclosure title={plural(l.length, "link")}>
                                                <ul>{l.map((x) => (<li>{linkLine(x)}</li>))}</ul>
                                            </Disclosure>
                                        ),
                                    };
                                })}
                            />
                        </Section>
                    ))}
                </>
            ),
        }),
    );
}

// ---- parts.html and part pages
{
    const path = "parts.html";
    for (const p of parts) place("SystemPart", p.id, path);
    emit(
        path,
        shell(path, {
            eyebrow: "System",
            title: "Parts of the system",
            lede: `${plural(parts.length, "part")}: the programs, sites and databases the system is made of.`,
            children: (
                <DataTable
                    caption="Parts"
                    columns={[
                        { key: "name", label: "Part", rowHeader: true },
                        { key: "kind", label: "Kind" },
                        { key: "purpose", label: "What it is for" },
                        { key: "blocks", label: "Blocks", numeric: true },
                        { key: "facts", label: "Findings", numeric: true },
                    ]}
                    empty="No parts."
                    rows={parts.map((p) => ({
                        name: <a href={link(path, partPage.get(p.id) as string)}>{p.body.name}</a>,
                        kind: run.partKinds.get(p.body.kind)?.words ?? p.body.kind,
                        purpose: p.body.purpose,
                        blocks: num(blocks.filter((b) => partOfBlock.get(b.id) === p.id).length),
                        facts: factsOfSubject(p.id).length,
                    }))}
                />
            ),
        }),
    );
    for (const p of parts) {
        const pp = partPage.get(p.id) as string;
        place("SystemPart", p.id, pp);
        (p.body.evidence ?? []).forEach((e: Lines) => cite(e, `Part: ${p.body.name}`, pp, p.id));
        const mine = factsOfSubject(p.id);
        const eps = run.rows<{ block: string; name: string; startedBy: string; purpose: string; file: string; firstLine: number; lastLine: number; capability: string | null }>(
            `select e.entryPoint as block,e.name,e.startedBy,e.purpose,e.file,e.firstLine,e.lastLine,e.capability from v_entry_point e join v_part_blocks pb on pb.block=e.entryPoint where pb.part='${p.id}'`,
        );
        emit(
            pp,
            shell(pp, {
                eyebrow: `Part · ${run.partKinds.get(p.body.kind)?.words ?? p.body.kind}`,
                title: p.body.name,
                lede: p.body.purpose,
                sections: [
                    { id: "found", label: "What was found" },
                    { id: "entry-points", label: "Entry points" },
                    { id: "folders", label: "Where it lives" },
                ],
                children: (
                    <>
                        <span id={p.id}></span>
                        {copyHere(partContext(p))}
                        <SummaryStrip
                            label="Part in numbers"
                            figures={[
                                { label: "Blocks of code", value: num(blocks.filter((b) => partOfBlock.get(b.id) === p.id).length) },
                                { label: "Entry points", value: num(eps.length) },
                                { label: "Findings", value: mine.length },
                            ]}
                        />
                        <Section id="found" title="What was found" lede={`${plural(mine.length, "finding")} about this part.`}>
                            {mine.map((f) => factCard(f, pp, false))}
                        </Section>
                        <Section id="entry-points" title="Entry points" lede="Where work starts in this part.">
                            <DataTable
                                caption="Entry points"
                                columns={[
                                    { key: "name", label: "Entry point", rowHeader: true },
                                    { key: "by", label: "Started by" },
                                    { key: "purpose", label: "What it does" },
                                    { key: "cap", label: "Capability" },
                                ]}
                                empty="No entry points in this part."
                                rows={eps.map((e) => ({
                                    name: <a href={link(pp, codeMapPage.get(p.id) as string, e.block)}>{e.name}</a>,
                                    by: e.startedBy,
                                    purpose: e.purpose,
                                    cap: e.capability ? <a href={link(pp, capPage.get(e.capability) as string)}>{nameOf(e.capability)}</a> : "none",
                                }))}
                            />
                        </Section>
                        <Section id="folders" title="Where it lives">
                            <ul>{(p.body.folders ?? []).map((f: string) => (<li>{f}</li>))}</ul>
                            <p>
                                <a href={link(pp, codeMapPage.get(p.id) as string)}>Open the code map of this part</a>
                            </p>
                        </Section>
                    </>
                ),
            }),
        );
    }
}

// ---- capabilities (lean pages; rules and findings on their own pages)
const ruleHome = new Map<string, string>();
{
    const index = "capabilities.html";
    for (const c of capabilities) {
        for (const r of capRules.get(c.id) ?? []) if (!ruleHome.has(r.id)) ruleHome.set(r.id, capRulesPage.get(c.id) as string);
    }
    emit(
        index,
        shell(index, {
            eyebrow: "What the system does",
            title: "Capabilities",
            lede: `${plural(capabilities.length, "capability", "capabilities")}, grouped into ${plural(groups.length, "area")}. A capability marked "mapped only" has its entry points and code mapped but its rules not studied.`,
            children: (
                <DataTable
                    caption="Capabilities"
                    columns={[
                        { key: "name", label: "Capability", rowHeader: true },
                        { key: "area", label: "Area" },
                        { key: "purpose", label: "What it does" },
                        { key: "depth", label: "Depth" },
                        { key: "eps", label: "Pages", numeric: true },
                        { key: "facts", label: "Findings", numeric: true },
                    ]}
                    empty="No capabilities."
                    rows={capabilities.map((c) => ({
                        name: <a href={link(index, capPage.get(c.id) as string)}>{c.body.name}</a>,
                        area: groups.find((g) => (g.body.capabilities as string[]).includes(c.id))?.body.name ?? "none",
                        purpose: firstSentence(c.body.purpose),
                        depth: (capRules.get(c.id) ?? []).length > 0 ? "studied" : "mapped only",
                        eps: new Set(epsOfCap(c.id).map((e) => e.file)).size,
                        facts: factsOfSubject(c.id).length,
                    }))}
                />
            ),
        }),
    );
    let ruleIdx = 0;
    for (const c of capabilities) {
        const path = capPage.get(c.id) as string;
        const rpath = capRulesPage.get(c.id) as string;
        const fpath = capFindingsPage.get(c.id) as string;
        const myRules = [...(capRules.get(c.id) ?? [])].sort((a, b) => {
            const la = run.labelOf(a.id).label === "disputed" ? 0 : 1;
            const lb = run.labelOf(b.id).label === "disputed" ? 0 : 1;
            return la - lb;
        });
        const eps = epsOfCap(c.id);
        const pagesOf = new Map<string, EpRow[]>();
        for (const e of eps) pagesOf.set(e.file, [...(pagesOf.get(e.file) ?? []), e]);
        const changing = eps.filter((e) => changesOf(e.id).size > 0).length;
        const area = groups.find((g) => (g.body.capabilities as string[]).includes(c.id));
        const mine = factsOfSubject(c.id);
        const risks = [...(riskFactsOfCap.get(c.id) ?? [])].sort(bySeverity);
        const disputed = disputedOf(c.id);
        const myInterfaces = interfaces.filter((x) => x.e.capability === c.id);
        const owns = ownsOf(c.id);
        const uses = usesOf(c.id);
        const spineUses = uses.filter((e) => spineIds.has(e.id));
        const otherUses = uses.filter((e) => !spineIds.has(e.id));
        for (const a of entryAssignments.filter((x) => x.body.capability === c.id)) place("EntryPointAssignment", a.id, path);
        place("Capability", c.id, path);
        const surfaceRows = [...pagesOf.entries()]
            .map(([file, es]) => {
                const ch = new Set<string>();
                for (const e of es) for (const x of changesOf(e.id)) ch.add(x);
                return { file, es, ch };
            })
            .sort((a, b) => (b.ch.size > 0 ? 1 : 0) - (a.ch.size > 0 ? 1 : 0) || b.es.length - a.es.length || (a.file < b.file ? -1 : 1));
        const attention: { href: string; text: string; where: string; marks: Mark[] }[] = [
            ...risks.slice(0, 3).map((f) => ({ href: link(path, "findings.html", f.id), text: plain(f.body.statement), where: subjectLabel(f), marks: [riskMark(f) as Mark] })),
            ...disputed.slice(0, 2).map((r) => ({ href: link(path, rpath, r.id), text: plain(r.body.says), where: "Business rule", marks: [labelMark("disputed")] })),
        ];
        emit(
            path,
            shell(path, {
                eyebrow: `Capability${area ? ` · ${area.body.name}` : ""}`,
                title: c.body.name,
                lede: c.body.purpose,
                sections: [
                    { id: "coverage", label: "How well it is studied" },
                    { id: "data", label: "What it keeps and uses" },
                    { id: "attention", label: "Needs attention" },
                    { id: "interfaces", label: "Interfaces" },
                    { id: "surface", label: "Code surface" },
                ],
                children: (
                    <>
                        {copyHere(capContext(c))}
                        <Section id="coverage" title="How well it is studied">
                            {myRules.length > 0 ? (
                                <p>{`Studied in depth: ${num(myRules.length)} business rules, ${disputed.length} still disputed. `}<a href={link(path, rpath)}>{`All ${num(myRules.length)} rules`}</a>{mine.length > 0 && <> · <a href={link(path, fpath)}>{`All ${mine.length} findings`}</a></>}</p>
                            ) : (
                                <p>{`Mapped only: its ${plural(eps.length, "entry point")} and code are mapped, but its rules were not studied.`}{mine.length > 0 && <> <a href={link(path, fpath)}>{`${mine.length} findings`}</a></>}</p>
                            )}
                            <Disclosure title="What belongs in this capability">
                                <p>{c.body.membershipRule}</p>
                            </Disclosure>
                        </Section>
                        <Section id="data" title="What it keeps and uses">
                            <p>
                                <strong>Keeps:</strong> {owns.length === 0 ? "no kind of data that it mainly writes." : null}
                            </p>
                            {owns.length > 0 && <ul class="chips" role="list">{owns.map((e) => (<li><a href={link(path, entPage.get(e.id) as string)}>{e.body.name}</a></li>))}</ul>}
                            <p>
                                <strong>Uses from the shared data:</strong> {spineUses.length === 0 ? "none of the shared core kinds of data." : null}
                            </p>
                            {spineUses.length > 0 && <ul class="chips" role="list">{spineUses.map((e) => (<li><a href={link(path, entPage.get(e.id) as string)}>{e.body.name}</a></li>))}</ul>}
                            {otherUses.length > 0 && (
                                <>
                                    <p><strong>Also uses:</strong></p>
                                    <ul class="chips" role="list">{otherUses.slice(0, 8).map((e) => (<li><a href={link(path, entPage.get(e.id) as string)}>{e.body.name}</a></li>))}{otherUses.length > 8 && <li>{`and ${otherUses.length - 8} more`}</li>}</ul>
                                </>
                            )}
                        </Section>
                        <Section id="attention" title="Needs attention" lede="The few things in this capability that most need a person.">
                            {attention.length === 0 ? <p>Nothing here carries a risk or a disputed rule.</p> : (
                                <ul class="register" role="list">
                                    {attention.map((a) => (<RegisterRow href={a.href} text={a.text} where={a.where} marks={a.marks} />))}
                                </ul>
                            )}
                            {(risks.length > 3 || disputed.length > 2) && <p class="meta">{`${Math.max(0, risks.length - 3)} more risky findings and ${Math.max(0, disputed.length - 2)} more disputed rules: see the lists above.`}</p>}
                        </Section>
                        <Section id="interfaces" title="Interfaces" lede="Entry points started by another system or a schedule: what must keep working for those callers.">
                            {myInterfaces.length === 0 ? <p>None of this capability's entry points is started by another system or a schedule.</p> : (
                                <DataTable
                                    caption="Interfaces of this capability"
                                    columns={[{ key: "what", label: "Entry point", rowHeader: true }, { key: "by", label: "Started by" }, { key: "does", label: "What it does" }]}
                                    empty="None."
                                    rows={myInterfaces.slice(0, 25).map((x) => ({ what: <a href={link(path, codeMapOf(x.e.id) as string, x.e.id)}>{fileLines({ file: x.e.file, firstLine: x.e.firstLine, lastLine: x.e.lastLine })}</a>, by: startedShort(x.e.startedBy), does: plain(x.e.purpose) }))}
                                />
                            )}
                            {myInterfaces.length > 25 && <p class="meta">{`${myInterfaces.length - 25} more on the interfaces page.`}</p>}
                        </Section>
                        <Section id="surface" title="Code surface" lede={`${plural(pagesOf.size, "page")}, ${plural(eps.length, "entry point")}, ${changing} that change data. Folded: open it when you need to find the code.`}>
                            <Disclosure title={`Show the ${plural(pagesOf.size, "page")}`}>
                                <DataTable
                                    caption="Pages of this capability, those that change data first"
                                    columns={[
                                        { key: "file", label: "Page", rowHeader: true },
                                        { key: "does", label: "What it does" },
                                        { key: "by", label: "Started by" },
                                        { key: "changes", label: "Changes data" },
                                        { key: "n", label: "Entry points", numeric: true },
                                    ]}
                                    empty="No pages."
                                    rows={surfaceRows.slice(0, 120).map((r) => {
                                        const lead = r.es.find((e) => e.name === r.file.split("/").pop()) ?? r.es[0];
                                        return {
                                            file: <a href={link(path, codeMapOf((lead as EpRow).id) as string, (lead as EpRow).id)}>{r.file}</a>,
                                            does: plain(firstSentence((lead as EpRow).purpose)),
                                            by: [...new Set(r.es.map((e) => startedShort(e.startedBy)))].join(", "),
                                            changes: r.ch.size === 0 ? "no" : `${[...r.ch].slice(0, 3).map(nameOf).join(", ")}${r.ch.size > 3 ? ", …" : ""}`,
                                            n: r.es.length,
                                        };
                                    })}
                                />
                                {surfaceRows.length > 120 && <p class="meta">{`${surfaceRows.length - 120} more pages: see the code index.`}</p>}
                            </Disclosure>
                        </Section>
                    </>
                ),
            }),
        );
        // all rules of the capability
        emit(
            rpath,
            shell(rpath, {
                eyebrow: `Capability · ${c.body.name}`,
                title: `Business rules: ${c.body.name}`,
                lede: `${plural(myRules.length, "rule")} the code decides in this capability, disputed ones first.`,
                children: (
                    <>
                        <p><a href={link(rpath, path)}>Back to the capability</a></p>
                        {myRules.map((r) => ruleCard(r, rpath, c.body.name, ruleIdx++))}
                    </>
                ),
            }),
        );
        // all findings of the capability, as rows
        emit(
            fpath,
            shell(fpath, {
                eyebrow: `Capability · ${c.body.name}`,
                title: `Findings: ${c.body.name}`,
                lede: `${plural(mine.length, "finding")} about this capability, as rows. Open one for its evidence.`,
                children: (
                    <>
                        <p><a href={link(fpath, path)}>Back to the capability</a></p>
                        <ul class="register" role="list">
                            {mine.map((f) => (<RegisterRow href={link(fpath, "findings.html", f.id)} text={plain(f.body.statement)} where={subjectLabel(f)} marks={[standingOf(f), ...(riskMark(f) ? [riskMark(f) as Mark] : [])]} context={factContext(f)} />))}
                        </ul>
                    </>
                ),
            }),
        );
    }
}

// ---- unattributed rules go on rules.html
{
    const path = "rules.html";
    const unattached = rules.filter((r) => ruleCaps(r.id).length === 0);
    unattached.forEach((r) => ruleHome.set(r.id, path));
    let idx = 100000;
    emit(
        path,
        shell(path, {
            eyebrow: "Business rules",
            title: "Rules and where each one is shown",
            lede: `${num(rules.length)} rules the code decides. Those with a capability are on its page; ${plural(unattached.length, "rule")} belong to no capability and are listed here.`,
            sections: [
                { id: "counts", label: "Rules by capability" },
                { id: "no-capability", label: "Rules without a capability" },
            ],
            children: (
                <>
                    <Section id="counts" title="Rules by capability">
                        <DataTable
                            caption="Rules by capability"
                            columns={[{ key: "cap", label: "Capability", rowHeader: true }, { key: "n", label: "Rules", numeric: true }]}
                            empty="No rules."
                            rows={capabilities.map((c) => ({ cap: <a href={link(path, capRulesPage.get(c.id) as string)}>{c.body.name}</a>, n: rules.filter((r) => ruleCaps(r.id).includes(c.id)).length }))}
                        />
                    </Section>
                    <Section id="no-capability" title="Rules without a capability" lede="Their code is not reached from any entry point that a capability holds.">
                        {unattached.map((r) => ruleCard(r, path, "No capability", idx++))}
                    </Section>
                </>
            ),
        }),
    );
}

// ---- kinds of data
{
    const index = "kinds-of-data.html";
    emit(
        index,
        shell(index, {
            eyebrow: "What the system keeps",
            title: "Kinds of data",
            lede: `${plural(entities.length, "kind")} of business data, ${plural(lifecycles.length, "life", "lives")} of which show how they change state.`,
            children: (
                <DataTable
                    caption="Kinds of data"
                    columns={[
                        { key: "name", label: "Kind of data", rowHeader: true },
                        { key: "purpose", label: "What it is" },
                        { key: "life", label: "Life", numeric: true },
                        { key: "facts", label: "Findings", numeric: true },
                    ]}
                    empty="No kinds of data."
                    rows={entities.map((e) => ({
                        name: <a href={link(index, entPage.get(e.id) as string)}>{e.body.name}</a>,
                        purpose: e.body.purpose,
                        life: lifecycleOf.has(e.id) ? ((lifecycleOf.get(e.id) as Rec).body.states ? `${(lifecycleOf.get(e.id) as Rec).body.states.length} states` : "no states") : "none",
                        facts: factsOfSubject(e.id).length,
                    }))}
                />
            ),
        }),
    );
    for (const e of entities) {
        const path = entPage.get(e.id) as string;
        const life = lifecycleOf.get(e.id);
        const mine = factsOfSubject(e.id);
        const caps = run.rows<{ capability: string }>(`select capability from v_capability_entities where entity='${e.id}'`).map((r) => r.capability);
        const defs = run.rows<{ definition: string; name: string; file: string; firstLine: number; lastLine: number }>(`select definition,name,file,firstLine,lastLine from v_entity_definitions where entity='${e.id}'`);
        const myTrans = life ? transitions.filter((t) => t.body.lifecycle === life.id) : [];
        const savers = savingPlaces(e.id);
        place("Entity", e.id, path);
        if (life) {
            place("Lifecycle", life.id, path);
            ((life.body.states ?? []) as any[]).forEach((s) => (s.evidence ?? []).forEach((ev: Lines) => cite(ev, `State: ${s.name}`, path, life.id)));
            (life.body.states ? [] : (life.body.evidence ?? [])).forEach((ev: Lines) => cite(ev, "Why this kind of data has no states", path, life.id));
            myTrans.forEach((t) => {
                place("Transition", t.id, path);
                cite(t.body.writtenAt, `Transition: ${gateText(t.id)}`, path, t.id);
            });
        }
        emit(
            path,
            shell(path, {
                eyebrow: "Kind of data",
                title: e.body.name,
                lede: e.body.purpose,
                sections: [
                    { id: "owner", label: "Who keeps it" },
                    { id: "changed-by", label: "Changed by" },
                    { id: "life", label: "How it changes state" },
                    { id: "found", label: "What was found" },
                    { id: "shapes", label: "How it is written" },
                ],
                children: (
                    <>
                        {copyHere(entityContext(e))}
                        <Section id="owner" title="Who keeps it" lede={ownerOf.has(e.id) ? undefined : "No single capability writes most of it; many capabilities change it."}>
                            {ownerOf.has(e.id) && <p>Mainly written by <a href={link(path, capPage.get(ownerOf.get(e.id) as string) as string)}>{nameOf(ownerOf.get(e.id) as string)}</a>.</p>}
                            <p>{`Used by ${plural(touchCaps.get(e.id)?.size ?? 0, "capability", "capabilities")}${spineIds.has(e.id) ? " (a shared core kind of data)" : ""}:`}</p>
                            <ul class="chips" role="list">
                                {[...(touchCaps.get(e.id) ?? [])].slice(0, 10).map((c) => (<li><a href={link(path, capPage.get(c) as string)}>{nameOf(c)}</a></li>))}
                                {(touchCaps.get(e.id)?.size ?? 0) > 10 && <li>{`and ${(touchCaps.get(e.id)?.size ?? 0) - 10} more`}</li>}
                            </ul>
                            <Disclosure title="What counts as one"><p>{e.body.membershipRule}</p></Disclosure>
                        </Section>
                        <Section id="changed-by" title="Changed by" lede={`The ${plural(savers.length, "place")} in the code that save it. A save in shared code is reached from many entry points, so the places are listed, not every page.`}>
                            <DataTable
                                caption={`Places that save ${e.body.name}`}
                                columns={[{ key: "where", label: "Where", rowHeader: true }, { key: "what", label: "What the code is" }, { key: "reach", label: "Reached from", numeric: true }, { key: "cap", label: "Capability" }]}
                                empty="Nothing in the mapped code saves this kind of data."
                                rows={savers.slice(0, 15).map((x) => ({
                                    where: <a href={link(path, (codeMapPage.get(partOfBlock.get(x.block) ?? "") ?? "code-map.html") as string, x.block)}>{fileLines(x.lines)}</a>,
                                    what: x.what,
                                    reach: x.reached === 0 ? "none known" : `${x.reached} entry points`,
                                    cap: x.caps.slice(0, 2).map(nameOf).join(", "),
                                }))}
                            />
                            {savers.length > 15 && <p class="meta">{`${savers.length - 15} more places: see the copy-context for the full list.`}</p>}
                        </Section>
                        <Section id="life" title="How it changes state" lede={life?.body.states ? `State fields: ${(life.body.stateFields as string[]).join(", ")}.` : "This kind of data has no states the code acts on."}>
                            {life && !life.body.states && <p id={life.id}>{life.body.noStates}</p>}
                            {life?.body.states && (
                                <div id={life.id}>
                                    <FlowDiagram label={`States of ${e.body.name}`} steps={(life.body.states as any[]).map((s) => ({ name: s.name, detail: s.writtenAs }))} />
                                    <DataTable
                                        caption="Transitions between states"
                                        columns={[
                                            { key: "change", label: "Change", rowHeader: true },
                                            { key: "at", label: "Written at" },
                                            { key: "rules", label: "Rules that decide it" },
                                        ]}
                                        empty="No transitions."
                                        rows={myTrans.map((t) => {
                                            const gating = [...ruleGates.entries()].filter(([, ts]) => ts.includes(t.id)).map(([r]) => run.records.get(r) as Rec).filter(Boolean);
                                            return {
                                                change: <span id={t.id}>{gateText(t.id)?.replace(`${e.body.name}: `, "")}</span>,
                                                at: fileLines(t.body.writtenAt),
                                                rules: gating.length === 0 ? "none recorded" : (<ul>{gating.slice(0, 5).map((r) => (<li><a href={link(path, ruleHome.get(r.id) ?? "rules.html", r.id)}>{plain(r.body.says)}</a></li>))}{gating.length > 5 && <li>{`and ${gating.length - 5} more`}</li>}</ul>),
                                            };
                                        })}
                                    />
                                </div>
                            )}
                        </Section>
                        <Section id="found" title="What was found" lede={`${plural(mine.length, "finding")}.`}>{mine.map((f) => factCard(f, path, false))}</Section>
                        <Section id="shapes" title="How it is written in the code">
                            {defs.length === 0 ? <p>No data definition was matched to it.</p> : <ul>{defs.map((d) => (<li>{`${d.name} (${d.file} lines ${d.firstLine}–${d.lastLine})`}</li>))}</ul>}
                        </Section>
                    </>
                ),
            }),
        );
    }
}

// ---- system.html: technologies, areas, system facts
{
    const path = "system.html";
    technologies.forEach((t) => {
        place("Technology", t.id, path);
        (t.body.uses ?? []).forEach((u: any) => (u.evidence ?? []).forEach((ev: Lines) => cite(ev, `Technology: ${t.body.name}`, path, "technologies")));
    });
    groups.forEach((g) => place("CapabilityGroup", g.id, path));
    const systemFacts = factsOfSubject("system");
    const byAspect = new Map<string, Rec[]>();
    for (const f of systemFacts) byAspect.set(f.body.aspect, [...(byAspect.get(f.body.aspect) ?? []), f]);
    const techFacts = facts.filter((f) => run.records.get(sid(f))?.type === "Technology");
    emit(
        path,
        shell(path, {
            eyebrow: "System",
            title: "The system as a whole",
            lede: "What the system is, how it is built, what it does and where it is at risk.",
            sections: [
                { id: "areas", label: "Areas of the shop" },
                { id: "answers", label: "Answers about the system" },
                { id: "technologies", label: "Technologies" },
            ],
            children: (
                <>
                    <Section id="areas" title="Areas of the shop" lede="The capabilities, grouped by what they are for.">
                        {groups.map((g) => (
                            <>
                                <h3>{g.body.name}</h3>
                                <p>{g.body.purpose}</p>
                                <ul>{(g.body.capabilities as string[]).map((c) => (<li><a href={link(path, capPage.get(c) as string)}>{nameOf(c)}</a></li>))}</ul>
                            </>
                        ))}
                    </Section>
                    <Section id="answers" title="Answers about the system" lede={`${plural(systemFacts.length, "finding")}, by the question they answer.`}>
                        {[...byAspect.entries()].map(([aspect, list], i) => (
                            <TopicBlock
                                id={`topic-${i}`}
                                question={run.aspects.get(aspect)?.words ?? aspect}
                                answer={list.filter((f) => basisOf(f) === "concluded").map((f) => factCard(f, path, false))}
                                facts={list.filter((f) => basisOf(f) !== "concluded").map((f) => factCard(f, path, false))}
                            />
                        ))}
                    </Section>
                    <Section id="technologies" title="Technologies" lede={`${plural(technologies.length, "technology", "technologies")} the code is written in or depends on, and ${plural(techFacts.length, "finding")} about them.`}>
                        <DataTable
                            caption="Technologies"
                            columns={[
                                { key: "name", label: "Technology", rowHeader: true },
                                { key: "kind", label: "Kind" },
                                { key: "covers", label: "Covers" },
                                { key: "parts", label: "Used in", numeric: true },
                            ]}
                            empty="No technologies."
                            rows={technologies.map((t) => ({
                                name: t.body.name,
                                kind: t.body.kind,
                                covers: (t.body.covers ?? []).slice(0, 6).join(", "),
                                parts: new Set((t.body.uses ?? []).flatMap((u: any) => u.parts ?? [])).size,
                            }))}
                        />
                        {techFacts.map((f) => factCard(f, path, false))}
                    </Section>
                </>
            ),
        }),
    );
}

// ---- external systems and resources, data definitions, code kinds
{
    const path = "external-systems.html";
    externals.forEach((x) => { place("ExternalSystem", x.id, path); (x.body.evidence ?? []).forEach((ev: Lines) => cite(ev, `External system: ${x.body.name}`, path, x.id)); });
    resourceAssignments.forEach((r) => place("ResourceAssignment", r.id, path));
    emit(
        path,
        shell(path, {
            eyebrow: "What the system talks to",
            title: "External systems and what is reached in them",
            lede: `${plural(externals.length, "external system")}, and ${num(resourceAssignments.length)} resources reached in them, each assigned to a kind of data or marked as holding none.`,
            sections: [{ id: "systems", label: "External systems" }, { id: "resources", label: "Resources and the data they hold" }],
            children: (
                <>
                    <Section id="systems" title="External systems">
                        <DataTable
                            caption="External systems"
                            columns={[{ key: "name", label: "System", rowHeader: true }, { key: "kind", label: "Kind" }, { key: "by", label: "How it is reached" }, { key: "n", label: "Resources", numeric: true }]}
                            empty="None."
                            rows={externals.map((x) => ({ name: <span id={x.id}>{x.body.name}</span>, kind: x.body.kind, by: x.body.reachedBy, n: [...resourceRows.values()].filter((r) => run.byNumber.get(r.externalSystem) === x.id).length }))}
                        />
                    </Section>
                    <Section id="resources" title="Resources and the data they hold" lede="A resource is a named thing reached in an external system: an operation, a table, a file.">
                        <DataTable
                            caption="Resources"
                            columns={[{ key: "res", label: "Resource", rowHeader: true }, { key: "sys", label: "In" }, { key: "entity", label: "Kind of data" }]}
                            empty="None."
                            rows={resourceAssignments.map((r) => {
                                const row = resourceRows.get(r.body.resource);
                                const entity = r.body.entity as string | undefined;
                                return {
                                    res: row?.resource ?? "(resource not found)",
                                    sys: row ? nameOf(run.byNumber.get(row.externalSystem) ?? "") : "",
                                    entity: entity ? <a href={link(path, entPage.get(entity) as string)}>{nameOf(entity)}</a> : `holds no business data: ${r.body.notBusinessDataReason ?? ""}`,
                                };
                            })}
                        />
                    </Section>
                </>
            ),
        }),
    );
}
{
    const path = "data-definitions.html";
    definitions.forEach((d) => place("DataDefinition", d.id, path));
    shapeAssignments.forEach((s) => place("ShapeAssignment", s.id, path));
    const entityOfDef = new Map(shapeAssignments.filter((s) => s.body.entity !== undefined).map((s) => [s.body.definition, s.body.entity]));
    const reasonOfDef = new Map(shapeAssignments.filter((s) => s.body.entity === undefined).map((s) => [s.body.definition, (s.body.notBusinessDataReason ?? s.body.reason ?? "holds no business data") as string]));
    emit(
        path,
        shell(path, {
            eyebrow: "What the code declares",
            title: "Data definitions and the kinds of code",
            lede: `${num(definitions.length)} declared shapes of data in the code, ${plural(shapeAssignments.length, "shape")} assigned to a kind of data, and the ${plural(codeKinds.length, "kind")} of code in ${plural(layers.length, "layer")}.`,
            sections: [{ id: "layers", label: "Layers and kinds of code" }, { id: "definitions", label: "Data definitions" }],
            children: (
                <>
                    <Section id="layers" title="Layers and kinds of code">
                        {layers.map((l) => {
                            place("Layer", l.id, path);
                            (l.body.evidence ?? []).forEach((ev: Lines) => cite(ev, `Layer: ${l.body.name}`, path, l.id));
                            return (
                                <>
                                    <h3 id={l.id}>{l.body.name}</h3>
                                    <p>{l.body.purpose}</p>
                                    <ul>
                                        {codeKinds.filter((k) => k.body.layer === l.id).map((k) => {
                                            place("CodeKind", k.id, path);
                                            return (<li id={k.id}><strong>{k.body.name}</strong>: {k.body.membershipRule}</li>);
                                        })}
                                    </ul>
                                </>
                            );
                        })}
                    </Section>
                    <Section id="definitions" title="Data definitions">
                        <DataTable
                            caption="Data definitions"
                            columns={[{ key: "name", label: "Written as", rowHeader: true }, { key: "kind", label: "Kind of code" }, { key: "at", label: "Where" }, { key: "entity", label: "Kind of data" }, { key: "fields", label: "Fields", numeric: true }]}
                            empty="None."
                            rows={definitions.map((d) => ({
                                name: <span id={d.id}>{d.body.writtenAs}</span>,
                                kind: nameOf(d.body.codeKind),
                                at: fileLines(d.body.lines),
                                entity: entityOfDef.has(d.id) ? <a href={link(path, entPage.get(entityOfDef.get(d.id) as string) as string)}>{nameOf(entityOfDef.get(d.id) as string)}</a> : (reasonOfDef.get(d.id) ?? "none"),
                                fields: (d.body.fields ?? []).length,
                            }))}
                        />
                    </Section>
                </>
            ),
        }),
    );
}

// ---- stray links (not inside any block)
{
    const path = "code-map.html";
    strayLinks.forEach((l) => place("Link", l.id, path));
    emit(
        path,
        shell(path, {
            eyebrow: "Code map",
            title: "Code map: where to start",
            lede: `${num(blocks.length)} blocks and ${num(links.length)} links, one page per part.`,
            children: (
                <>
                    <DataTable
                        caption="Code map pages"
                        columns={[{ key: "part", label: "Part", rowHeader: true }, { key: "blocks", label: "Blocks", numeric: true }]}
                        empty="None."
                        rows={parts.map((p) => ({ part: <a href={link(path, codeMapPage.get(p.id) as string)}>{p.body.name}</a>, blocks: num(blocks.filter((b) => partOfBlock.get(b.id) === p.id).length) }))}
                    />
                    <Section id="stray" title="Links outside any block" lede={`${plural(strayLinks.length, "link")} start at lines that no mapped block holds.`}>
                        <DataTable
                            caption="Links outside any block"
                            columns={[{ key: "at", label: "Written at", rowHeader: true }, { key: "what", label: "What it does" }]}
                            empty="None."
                            rows={strayLinks.map((l) => ({ at: fileLines(l.body.lines), what: linkLine(l) }))}
                        />
                    </Section>
                </>
            ),
        }),
    );
}

// ---- assumptions and risks
{
    const path = "assumptions.html";
    const assumed = facts.filter((f) => basisOf(f) === "assumed");
    emit(
        path,
        shell(path, {
            eyebrow: "Register",
            title: "Assumptions",
            lede: `${plural(assumed.length, "assumption")}: things the analysis went with because no file settles them. Each says what would confirm it and what changes if it is wrong.`,
            children: (
                <ul class="register" role="list">
                    {assumed.map((f) => (
                        <RegisterRow
                            href={link(path, "findings.html", f.id)}
                            text={plain(f.body.statement)}
                            where={subjectLabel(f)}
                            marks={[standingOf(f), ...(riskMark(f) ? [riskMark(f) as Mark] : [])]}
                            detail={`If wrong: ${plain(f.body.basis.assumed.ifWrong)} Confirm with ${run.confirmWith.get(f.body.basis.assumed.confirmWith)?.words ?? f.body.basis.assumed.confirmWith}.`}
                            context={factContext(f)}
                        />
                    ))}
                </ul>
            ),
        }),
    );
    const rpath = "risks.html";
    const risky = facts.filter((f) => f.body.risk);
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sorted = [...risky].sort((a, b) => rank[a.body.risk.severity] - rank[b.body.risk.severity]);
    emit(
        rpath,
        shell(rpath, {
            eyebrow: "Register",
            title: "Risks",
            lede: `${plural(risky.length, "finding")} that carry a risk, worst first, by kind of risk.`,
            sections: [{ id: "map", label: "Risk map" }, ...[...new Set(sorted.map((f) => f.body.risk.category as string))].map((c) => ({ id: c, label: run.riskCategories.get(c)?.words ?? c }))],
            children: (
                <>
                    <Section id="map" title="Risk map">
                        <RiskMap
                            label="Risks by kind"
                            risks={[...new Set(sorted.map((f) => f.body.risk.category as string))].map((c) => {
                                const list = sorted.filter((f) => f.body.risk.category === c);
                                return { label: `${run.riskCategories.get(c)?.words ?? c} (${list.length})`, href: `#${c}`, status: severityStatus(list[0].body.risk.severity), level: list[0].body.risk.severity };
                            })}
                        />
                    </Section>
                    {[...new Set(sorted.map((f) => f.body.risk.category as string))].map((c) => (
                        <Section id={c} title={run.riskCategories.get(c)?.words ?? c}>
                            <ul class="register" role="list">
                                {sorted.filter((f) => f.body.risk.category === c).map((f) => (
                                    <RegisterRow href={link(rpath, "findings.html", f.id)} text={plain(f.body.statement)} where={subjectLabel(f)} marks={[riskMark(f) as Mark, standingOf(f)]} context={factContext(f)} />
                                ))}
                            </ul>
                        </Section>
                    ))}
                </>
            ),
        }),
    );
}

// ---- stage pages and the open items
const textOfFinding = (id: string) => {
    const rec = run.records.get(id);
    if (rec === undefined) return undefined;
    if (rec.type === "Lifecycle") return `The life of ${nameOf(rec.body.entity)}`;
    return plain(String(rec.body.statement ?? rec.body.says ?? rec.body.name ?? rec.body.writtenAs ?? (rec.type === "Transition" ? gateText(id) : undefined) ?? `A ${rec.type}`));
};
const pageOfFinding = (id: string, from: string) => {
    const rec = run.records.get(id);
    if (rec === undefined) return undefined;
    if (rec.type === "Fact") return link(from, "findings.html", id);
    if (rec.type === "BusinessRule") return link(from, ruleHome.get(id) ?? "rules.html", id);
    if (rec.type === "Capability") return link(from, capPage.get(id) as string);
    if (rec.type === "Entity") return link(from, entPage.get(id) as string);
    if (rec.type === "Lifecycle") return link(from, entPage.get(rec.body.entity) as string, id);
    if (rec.type === "Transition") return link(from, entPage.get(run.records.get(rec.body.lifecycle)?.body.entity) as string, id);
    return undefined;
};
const stagePath = (s: StageKey) => `stages/${stageOrder.indexOf(s) + 1}-${s}.html`;
const stageLearned: Record<StageKey, () => string[]> = {
    inventory: () => [`${plural(parts.length, "part")} and ${plural(technologies.length, "technology", "technologies")} found.`, `${plural(run.of("Fact").filter((f) => f.stage === "inventory").length, "finding")} about the shape of the system.`],
    "how-it-runs": () => [`${plural(facts.filter((f) => f.stage === "how-it-runs").length, "finding")} on how the system is built, run and where it is at risk.`],
    map: () => [`${num(blocks.length)} blocks of code, ${num(links.length)} links between them, ${plural(definitions.length, "data definition")}.`, `${plural(externals.length, "external system")} and ${plural(codeKinds.length, "kind")} of code in ${plural(layers.length, "layer")}.`],
    "capabilities-and-entities": () => [`${plural(capabilities.length, "capability", "capabilities")} and ${plural(entities.length, "kind")} of data.`, `${num(entryAssignments.length)} entry points placed, ${num(resourceAssignments.length)} resources and ${num(shapeAssignments.length)} shapes assigned.`],
    "capability-rules": () => [`${num(rules.length)} business rules, ${plural(lifecycles.length, "life", "lives")} with ${plural(transitions.length, "transition")}.`],
    publish: () => [`${plural(groups.length, "area")} grouping the capabilities.`, `${plural(facts.filter((f) => f.stage === "publish").length, "concluded answer")} drawn from the facts beneath.`],
};
const stageWrote: Record<StageKey, [string, number][]> = {
    inventory: [["Parts", parts.length], ["Technologies", technologies.length], ["Findings", facts.filter((f) => f.stage === "inventory").length]],
    "how-it-runs": [["Findings", facts.filter((f) => f.stage === "how-it-runs").length]],
    map: [["Blocks", blocks.length], ["Links", links.length], ["Data definitions", definitions.length], ["External systems", externals.length], ["Kinds of code", codeKinds.length], ["Layers", layers.length], ["Findings", facts.filter((f) => f.stage === "map").length]],
    "capabilities-and-entities": [["Capabilities", capabilities.length], ["Kinds of data", entities.length], ["Entry points placed", entryAssignments.length], ["Resources assigned", resourceAssignments.length], ["Shapes assigned", shapeAssignments.length]],
    "capability-rules": [["Business rules", rules.length], ["Lives", lifecycles.length], ["Transitions", transitions.length], ["Findings", facts.filter((f) => f.stage === "capability-rules").length]],
    publish: [["Areas", groups.length], ["Concluded answers", facts.filter((f) => f.stage === "publish").length]],
};
const stageWhere: Record<StageKey, [string, string][]> = {
    inventory: [["Parts", "parts.html"], ["Technologies on the system page", "system.html#technologies"]],
    "how-it-runs": [["All findings", "findings.html"], ["System page", "system.html"]],
    map: [["Code map", "code-map.html"], ["External systems", "external-systems.html"], ["Data definitions", "data-definitions.html"]],
    "capabilities-and-entities": [["Capabilities", "capabilities.html"], ["Kinds of data", "kinds-of-data.html"]],
    "capability-rules": [["Rules and rules with no capability", "rules.html"], ["Kinds of data (lives)", "kinds-of-data.html"]],
    publish: [["System page (areas)", "system.html"], ["Assumptions", "assumptions.html"], ["Risks", "risks.html"]],
};
const stageIds = (s: StageKey) => new Set([...run.records.values()].filter((r) => r.stage === s).map((r) => r.id));
const stageStats = new Map<StageKey, { challenged: number; disputed: number; corrected: number; dropped: number; missed: number }>();
for (const s of stageOrder) {
    const ids = stageIds(s);
    let disputed = 0;
    let corrected = 0;
    for (const id of ids) {
        const l = run.labelOf(id).label;
        if (l === "disputed") disputed += 1;
        if (l === "corrected") corrected += 1;
    }
    stageStats.set(s, { challenged: disputed + corrected, disputed, corrected, dropped: run.dropped.filter(([id]) => id.length > 0).length, missed: run.missed.filter((m) => m.stage === s).length });
}
for (const s of stageOrder) {
    const path = stagePath(s);
    const ids = stageIds(s);
    const stats = stageStats.get(s) as NonNullable<ReturnType<typeof stageStats.get>>;
    const disputed = [...ids].filter((id) => run.labelOf(id).label === "disputed");
    const corrected = [...ids].filter((id) => run.labelOf(id).label === "corrected");
    const missed = run.missed.filter((m) => m.stage === s);
    const drops = run.dropped;
    const stageNum = stageOrder.indexOf(s) + 1;
    emit(
        path,
        <StagePage
            eyebrow={`Stage ${stageNum} of ${stageOrder.length}`}
            title={stageTitle[s]}
            standing="done"
            said={`Done. ${stageLearned[s]()[0]}`}
            madeAt={madeAt}
            assets={assetsFor(path)}
            runPage={{ href: link(path, "run.html"), label: "Back to how it was analysed" }}
        >
            <Section id="wrote" title="What this stage wrote">
                <SummaryStrip label="Records written" figures={stageWrote[s].map(([label, value]) => ({ label, value: num(value) }))} />
                <ul>{stageLearned[s]().map((l) => (<li>{l}</li>))}</ul>
            </Section>
            <Section id="where" title="Where to see it">
                <ul>{stageWhere[s].map(([label, to]) => (<li><a href={link(path, to.split("#")[0] as string, to.split("#")[1])}>{label}</a></li>))}</ul>
            </Section>
            <Section id="review" title="What review did" lede="Every record is read against the code by a reviewer; a challenge is fixed once, and a second review judges only what the fix changed.">
                <SummaryStrip label="Review results" figures={[{ label: "Corrected after review", value: stats.corrected, status: "info" }, { label: "Still disputed", value: stats.disputed, status: stats.disputed ? "warn" : "pass" }, { label: "Reviewers' missing notes", value: stats.missed, status: stats.missed ? "warn" : "pass" }]} />
            </Section>
            <Section id="disputed" title="Still disputed" lede="A reviewer's challenge stands after the one fix. These need a person.">
                {disputed.length === 0 ? <p>Nothing is disputed in this stage.</p> : (
                    <ul class="register" role="list">
                        {disputed.slice(0, 400).map((id) => {
                            const c = run.labelOf(id).challenge;
                            const href = pageOfFinding(id, path);
                            return (<li class="register-row">{href ? <a href={href}>{textOfFinding(id)}</a> : textOfFinding(id)}<p class="register-detail"><strong>{c?.verdict}</strong>: {plain(c?.explanation ?? "")}</p></li>);
                        })}
                    </ul>
                )}
                {disputed.length > 400 && <p class="meta">{`${disputed.length - 400} more disputed records; the first 400 are listed.`}</p>}
            </Section>
            <Section id="corrected" title="Corrected after review" lede={`${plural(corrected.length, "record")} the reviewer challenged and the fix changed. Each carries its challenge on its card.`}>
                {corrected.length > 0 && (
                    <Disclosure title={`Show the ${corrected.length} corrected`}>
                        <ul>{corrected.slice(0, 400).map((id) => { const href = pageOfFinding(id, path); return (<li>{href ? <a href={href}>{textOfFinding(id)}</a> : textOfFinding(id)}</li>); })}</ul>
                    </Disclosure>
                )}
            </Section>
            <Section id="missed" title="What reviewers found missing" lede="Findings a reviewer says the stage should have made and did not.">
                {missed.length === 0 ? <p>No reviewer reported something missing in this stage.</p> : (
                    <ul class="register" role="list">
                        {missed.map((m) => (<li class="register-row">{plain(m.says)}<p class="register-detail">{m.evidence.slice(0, 4).map(fileLines).join("; ")}</p></li>))}
                    </ul>
                )}
            </Section>
            {s === "publish" && (
                <Section id="dropped" title="Challenged records no longer in the analysis" lede="A reviewer challenged these and the fix removed or replaced them.">
                    <p>{plural(drops.length, "challenge")} in all stages point at records that are gone.</p>
                    <Disclosure title="Show the reviewers' words">
                        <ul>{drops.slice(0, 200).map(([, e]) => (<li>{plain((e.final ?? e.first)?.explanation ?? "")}</li>))}</ul>
                    </Disclosure>
                </Section>
            )}
        </StagePage>,
    );
}

const readingOrder: [string, string, string][] = [
    ["index.html", "The map", "start here: what the system does, what it keeps, what needs attention"],
    ["capabilities.html", "Capabilities", "what the shop does, each with what it keeps and its rules one click away"],
    ["kinds-of-data.html", "Kinds of data", "what it keeps, who writes it, how each changes state"],
    ["interfaces.html", "Interfaces", "what other systems call into the shop"],
    ["code-index.html", "Code index", "every page of code with its capability, data it changes, rules and findings"],
    ["findings.html", "All findings", "every finding with the source lines it rests on"],
    ["assumptions.html", "Assumptions", "what was assumed, and what would confirm it"],
    ["risks.html", "Risks", "findings that carry a risk, worst first"],
    ["system.html", "The system as a whole", "areas, answers about the system, technologies"],
    ["parts.html", "Parts", "the programs, sites and databases"],
    ["rules.html", "Rules", "rules that belong to no capability"],
    ["external-systems.html", "External systems", "what the system talks to"],
    ["data-definitions.html", "Data definitions", "the shapes of data the code declares"],
    ["code-map.html", "Code map", "every block of code and what it reaches"],
    ["stages/1-inventory.html", "Stage pages 1 to 6", "what each stage wrote, what review did, what is still disputed"],
    ["coverage.html", "Coverage", "proof that every record in the run is on a page"],
];

// ---- run.html: how it was analysed
{
    const path = "run.html";
    emit(
        path,
        <RunOverview
            eyebrow="How it was analysed"
            title="The analysis run, stage by stage"
            lede="Every stage of the analysis has run. This page lists the stages and the order to read the other pages in."
            madeAt={madeAt}
            assets={assetsFor(path)}
            meta={navLinks(path)}
            stages={stageOrder.map((st) => ({ title: stageTitle[st], href: stagePath(st), standing: "done" as Standing, said: `Done. ${stageLearned[st]()[0]}`, learned: stageLearned[st]() }))}
        >
            <Section id="numbers" title="The run in numbers">
                <SummaryStrip
                    label="Run in numbers"
                    figures={[
                        { label: "Parts", value: parts.length },
                        { label: "Capabilities", value: capabilities.length },
                        { label: "Kinds of data", value: entities.length },
                        { label: "Findings", value: facts.length },
                        { label: "Business rules", value: num(rules.length) },
                        { label: "Blocks of code", value: num(blocks.length) },
                    ]}
                />
            </Section>
            <Section id="order" title="The order to read in" lede="Start at the map and go down; each step says what it shows.">
                <ol>
                    {readingOrder.map(([to, label, why]) => (<li><a href={link(path, to)}>{label}</a>: {why}</li>))}
                </ol>
            </Section>
        </RunOverview>,
    );
}

// ---- index.html: the map
{
    const path = "index.html";
    const purposeFact = facts.find((f) => sid(f) === "system" && f.body.aspect === "purpose" && basisOf(f) === "concluded") ?? facts.find((f) => sid(f) === "system" && f.body.aspect === "purpose");
    const riskTotal = facts.filter((f) => f.body.risk).length;
    const attention = (() => {
        const perSubject = new Map<string, number>();
        const out: Rec[] = [];
        for (const f of [...facts.filter((x) => x.body.risk)].sort(bySeverity || undefined)) {
            const key = sid(f);
            if ((perSubject.get(key) ?? 0) >= 2) continue;
            perSubject.set(key, (perSubject.get(key) ?? 0) + 1);
            out.push(f);
            if (out.length === 8) break;
        }
        return out;
    })();
    const tile = (c: Rec) => {
        const risks = riskFactsOfCap.get(c.id) ?? [];
        const high = risks.filter((f) => f.body.risk.severity === "high").length;
        const med = risks.filter((f) => f.body.risk.severity === "medium").length;
        const disp = disputedOf(c.id).length;
        const studied = (capRules.get(c.id) ?? []).length > 0;
        return (
            <a class="tile" href={link(path, capPage.get(c.id) as string)}>
                <h4>{c.body.name}</h4>
                <p>{firstSentence(c.body.purpose)}</p>
                <span class="card-marks">
                    {high > 0 && <StatusBadge status="fail" label={`${high} high-risk`} />}
                    {high === 0 && med > 0 && <StatusBadge status="warn" label={`${med} medium-risk`} />}
                    {disp > 0 && <StatusBadge status="warn" label={`${disp} disputed`} />}
                    <StatusBadge status={studied ? "info" : "neutral"} label={studied ? "studied" : "mapped only"} />
                </span>
            </a>
        );
    };
    emit(
        path,
        shell(path, {
            eyebrow: "Code analysis",
            title: "Policy Plus: what the code does",
            lede: purposeFact ? plain(purposeFact.body.statement) : "What this system does, what it keeps, and what needs attention.",
            sections: [
                { id: "attention", label: "Needs attention" },
                { id: "capabilities", label: "What it does" },
                { id: "data", label: "What it keeps" },
                { id: "boundary", label: "Where other systems come in" },
            ],
            children: (
                <>
                    <SummaryStrip
                        label="The system in numbers"
                        figures={[
                            { label: "Capabilities", value: capabilities.length },
                            { label: "Kinds of data", value: entities.length },
                            { label: "Entry points", value: num(epRows.length) },
                            { label: "Findings with a risk", value: riskTotal, status: "fail" },
                        ]}
                    />
                    <Section id="attention" title="Needs attention" lede="The highest risks, at most two per subject. Open one for its evidence and a brief for your coding agent.">
                        <ul class="register" role="list">
                            {attention.map((f) => (<RegisterRow href={link(path, "findings.html", f.id)} text={plain(f.body.statement)} where={subjectLabel(f)} marks={[riskMark(f) as Mark, standingOf(f)]} context={factContext(f)} />))}
                        </ul>
                        <p><a href={link(path, "risks.html")}>All {riskTotal} risks</a> · <a href={link(path, "assumptions.html")}>All assumptions</a></p>
                    </Section>
                    <Section id="capabilities" title="What it does" lede={`${plural(capabilities.length, "capability", "capabilities")} in ${plural(groups.length, "area")}. "Studied" means its rules were read in depth; "mapped only" means its entry points and code are mapped.`}>
                        {groups.map((g) => (
                            <>
                                <h3>{g.body.name}</h3>
                                <p class="meta">{g.body.purpose}</p>
                                <div class="tile-grid">{(g.body.capabilities as string[]).map((id) => tile(run.records.get(id) as Rec))}</div>
                            </>
                        ))}
                    </Section>
                    <Section id="data" title="What it keeps" lede={`${plural(spine.length, "kind")} of data are used by ${SPINE_MIN} or more capabilities. The other ${entities.length - spine.length} are kept by a few.`}>
                        <p><strong>Shared core data</strong></p>
                        <ul class="chips" role="list">
                            {spine.map((e) => (<li><a href={link(path, entPage.get(e.id) as string)}>{`${e.body.name} · ${touchCaps.get(e.id)?.size ?? 0}`}</a></li>))}
                        </ul>
                        <p><strong>Kept by few capabilities</strong></p>
                        <ul class="chips" role="list">
                            {entities.filter((e) => !spineIds.has(e.id)).map((e) => (<li><a href={link(path, entPage.get(e.id) as string)}>{e.body.name}</a></li>))}
                        </ul>
                    </Section>
                    <Section id="boundary" title="Where other systems come in">
                        <p>{`${num(interfaces.length)} entry points are started by something other than a person: other systems, schedules and install scripts.`} <a href={link(path, "interfaces.html")}>See the interfaces</a></p>
                        <p>For the code itself, use the <a href={link(path, "code-index.html")}>code index</a>.</p>
                    </Section>
                </>
            ),
        }),
    );
}

// ---- interfaces.html
{
    const path = "interfaces.html";
    emit(
        path,
        shell(path, {
            eyebrow: "Boundary",
            title: "What other systems call into the shop",
            lede: `${plural(interfaces.length, "entry point")} are started by something other than a person. These are what must keep working for those callers. The last group is mostly page script callbacks, kept for completeness.`,
            sections: interfaceGroups.map((g, i) => ({ id: `g${i}`, label: g })),
            children: (
                <>
                    {interfaceGroups.map((g, i) => {
                        const list = interfaces.filter((x) => x.group === g);
                        return (
                            <Section id={`g${i}`} title={g} lede={`${plural(list.length, "entry point")}.`}>
                                <DataTable
                                    caption={g}
                                    columns={[{ key: "where", label: "Where", rowHeader: true }, { key: "cap", label: "Capability" }, { key: "by", label: "Started by" }, { key: "does", label: "What it does" }]}
                                    empty="None."
                                    rows={list.map((x) => ({
                                        where: <a href={link(path, codeMapOf(x.e.id) as string, x.e.id)}>{fileLines({ file: x.e.file, firstLine: x.e.firstLine, lastLine: x.e.lastLine })}</a>,
                                        cap: x.e.capability ? <a href={link(path, capPage.get(x.e.capability) as string)}>{nameOf(x.e.capability)}</a> : "none",
                                        by: startedShort(x.e.startedBy),
                                        does: plain(x.e.purpose),
                                    }))}
                                />
                            </Section>
                        );
                    })}
                </>
            ),
        }),
    );
}

// ---- code-index.html: the reference
{
    const path = "code-index.html";
    const rows = [...pageRows.values()].sort((a, b) => (b.changes.size > 0 ? 1 : 0) - (a.changes.size > 0 ? 1 : 0) || b.eps.length - a.eps.length || (a.file < b.file ? -1 : 1));
    emit(
        path,
        shell(path, {
            eyebrow: "Reference",
            title: "Code index: every page of code",
            lede: `${plural(rows.length, "page")} that hold entry points, with the capabilities they belong to, the data they can change, and how many rules and findings sit on them. Type to filter.`,
            children: (
                <>
                    <p>
                        <input type="search" class="search" data-filter="code-index-table" placeholder="Filter by page, capability or data" aria-label="Filter the code index" autocomplete="off" />
                    </p>
                    <div id="code-index-table">
                        <DataTable
                            caption="Pages of code"
                            columns={[
                                { key: "file", label: "Page", rowHeader: true },
                                { key: "caps", label: "Capabilities" },
                                { key: "n", label: "Entry points", numeric: true },
                                { key: "by", label: "Started by" },
                                { key: "changes", label: "Changes data" },
                                { key: "rules", label: "Rules", numeric: true },
                                { key: "facts", label: "Findings", numeric: true },
                            ]}
                            empty="None."
                            rows={rows.map((r) => {
                                const lead = r.eps.find((e) => e.name === r.file.split("/").pop()) ?? (r.eps[0] as EpRow);
                                const caps = [...r.caps];
                                return {
                                    file: <a href={link(path, codeMapOf(lead.id) as string, lead.id)}>{r.file}</a>,
                                    caps: `${caps.slice(0, 2).map(nameOf).join(", ")}${caps.length > 2 ? `, and ${caps.length - 2} more` : ""}`,
                                    n: r.eps.length,
                                    by: r.other ? "a person and other systems" : "a person",
                                    changes: r.changes.size === 0 ? "no" : `${[...r.changes].slice(0, 3).map(nameOf).join(", ")}${r.changes.size > 3 ? ", …" : ""}`,
                                    rules: rulesInFile.get(r.file) ?? 0,
                                    facts: factsInFile.get(r.file) ?? 0,
                                };
                            })}
                        />
                    </div>
                </>
            ),
        }),
    );
}

// ---- evidence pages
for (const [file, list] of [...cites.entries()].sort()) {
    const path = evidencePage(file);
    const all = run.sourceLines(file);
    const ranges = list.map((c) => ({ a: Math.max(1, c.lines.firstLine - 2), b: c.lines.lastLine + 2 })).sort((x, y) => x.a - y.a);
    const merged: { a: number; b: number }[] = [];
    for (const r of ranges) {
        const last = merged[merged.length - 1];
        if (last && r.a <= last.b + 3) last.b = Math.max(last.b, r.b);
        else merged.push({ ...r });
    }
    emit(
        path,
        shell(path, {
            eyebrow: "Evidence",
            title: file,
            lede: `${plural(list.length, "finding")} cite this file. Each window shows the cited lines and what cites them.`,
            children: (
                <>
                    {all === undefined && <Callout status="warn" title="File not readable">{`${file} could not be read from the source folder.`}</Callout>}
                    {merged.map((w, i) => {
                        const inside = list.filter((c) => c.lines.firstLine <= w.b && c.lines.lastLine >= w.a);
                        const text = all ? numbered(file, w.a, Math.min(w.b, all.length)) : undefined;
                        return (
                            <Section id={`w${i}`} title={`Lines ${w.a}–${w.b}`}>
                                <ul>
                                    {inside.slice(0, 30).map((c) => (
                                        <li>
                                            <a href={link(path, c.page, c.anchor)}>{c.label === "" ? `Finding at lines ${c.lines.firstLine}–${c.lines.lastLine}` : `${c.label} (lines ${c.lines.firstLine}–${c.lines.lastLine})`}</a>
                                        </li>
                                    ))}
                                    {inside.length > 30 && <li>{`and ${inside.length - 30} more`}</li>}
                                </ul>
                                {text !== undefined && <CodeBlock id={`w-code-${i}`} title={`${file}, lines ${w.a}–${w.b}`} code={text} />}
                            </Section>
                        );
                    })}
                </>
            ),
        }),
    );
}

// ---- coverage
const placed = (type: string) => ledger.get(type)?.size ?? 0;
const coverageRows: { type: string; stored: number; shown: number; where: string }[] = [
    ["Fact", facts.length, "findings.html and subject pages"],
    ["BusinessRule", rules.length, "capability pages, rules.html"],
    ["Lifecycle", lifecycles.length, "kinds of data pages"],
    ["Transition", transitions.length, "kinds of data pages"],
    ["Capability", capabilities.length, "capability pages"],
    ["Entity", entities.length, "kinds of data pages"],
    ["CapabilityGroup", groups.length, "system.html"],
    ["SystemPart", parts.length, "parts pages"],
    ["Technology", technologies.length, "system.html"],
    ["ExternalSystem", externals.length, "external-systems.html"],
    ["DataDefinition", definitions.length, "data-definitions.html"],
    ["CodeKind", codeKinds.length, "data-definitions.html"],
    ["Layer", layers.length, "data-definitions.html"],
    ["Block", blocks.length, "code map pages"],
    ["Link", links.length, "code map pages, code-map.html"],
    ["EntryPointAssignment", entryAssignments.length, "capability pages"],
    ["ResourceAssignment", resourceAssignments.length, "external-systems.html"],
    ["ShapeAssignment", shapeAssignments.length, "data-definitions.html"],
].map(([type, stored, where]) => ({ type: type as string, stored: stored as number, shown: placed(type as string), where: where as string }));

// the checks over the pages built so far
const hrefOf = /href="([^"#]*)(?:#([^"]*))?"/g;
const idsOn = new Map<string, Set<string>>();
for (const [p, text] of pages) idsOn.set(p, new Set([...text.matchAll(/ id="([^"]+)"/g)].map((m) => m[1] as string)));
const brokenLinks: string[] = [];
let linkCount = 0;
for (const [p, text] of pages) {
    for (const m of text.matchAll(hrefOf)) {
        const target = m[1];
        const anchor = m[2];
        if (target !== undefined && /^(https?:|mailto:|\/\/)/.test(target)) continue;
        linkCount += 1;
        const dest = target === undefined || target === "" ? p : posix.normalize(posix.join(posix.dirname(p), target));
        if (dest === "coverage.html") continue;
        if (!pages.has(dest) && !dest.includes("assets/")) {
            brokenLinks.push(`${p} → ${dest}`);
            continue;
        }
        if (anchor !== undefined && anchor !== "" && pages.has(dest) && !idsOn.get(dest)?.has(decodeURIComponent(anchor))) brokenLinks.push(`${p} → ${dest}#${anchor}`);
    }
}
const idPattern = /\b(?:fact|capability|entity|businessrule|lifecycle|transition|block|part|technology|external|capabilitygroup|link|definition|codekind|layer|resource|resourceassignment|shapeassignment|entrypointassignment)-[0-9a-f]{12,20}\b/;
const leaks: string[] = [];
for (const [p, text] of pages) {
    const visible = visibleText(text);
    const m = idPattern.exec(visible);
    if (m) leaks.push(`${p} shows ${m[0]}`);
    if (visible.includes(root)) leaks.push(`${p} shows the analysis folder path`);
}
const gaps = coverageRows.filter((r) => r.stored !== r.shown);
const evidenceRows = run.rows<{ n: number }>("select count(*) n from v_fact_evidence")[0]?.n ?? 0;
const factEvidenceOnPages = facts.reduce((n, f) => n + evidenceOf(f).length, 0);
const unreadable = [...cites.keys()].filter((f) => run.sourceLines(f) === undefined);
{
    const path = "coverage.html";
    const rows = coverageRows;
    emit(
        path,
        shell(path, {
            eyebrow: "Proof",
            title: "Coverage: is every record on a page?",
            lede: "Every record in the run's store is counted, and the page that shows it is recorded. A difference means a record is missing from the pages.",
            status: gaps.length === 0 && brokenLinks.length === 0 && leaks.length === 0 ? { status: "pass", label: "no gap, no broken link, no leak" } : { status: "fail", label: "something is missing" },
            children: (
                <>
                    <Section id="ledger" title="Records in the store and on the pages">
                        <DataTable
                            caption="Coverage by kind of record"
                            columns={[{ key: "type", label: "Kind of record", rowHeader: true }, { key: "stored", label: "In the store", numeric: true }, { key: "shown", label: "On pages", numeric: true }, { key: "diff", label: "Difference", numeric: true }, { key: "where", label: "Shown in" }]}
                            empty="None."
                            rows={rows.map((r) => ({ type: r.type, stored: num(r.stored), shown: num(r.shown), diff: r.stored - r.shown, where: r.where }))}
                        />
                    </Section>
                    <Section id="checks" title="Other checks">
                        <DataTable
                            caption="Checks"
                            columns={[{ key: "what", label: "Check", rowHeader: true }, { key: "result", label: "Result" }]}
                            empty="None."
                            rows={[
                                { what: "Evidence rows in the store and on finding cards", result: `${num(evidenceRows)} in the store, ${num(factEvidenceOnPages)} on cards` },
                                { what: "Cited files that could not be read", result: unreadable.length === 0 ? "none" : unreadable.join(", ") },
                                { what: "Links checked, and broken", result: `${num(linkCount)} checked, ${brokenLinks.length} broken` },
                                { what: "Pages showing a record id or the analysis folder", result: leaks.length === 0 ? "none" : `${leaks.length}` },
                                { what: "Assumed findings on the assumptions page", result: `${facts.filter((f) => basisOf(f) === "assumed").length} of ${facts.filter((f) => basisOf(f) === "assumed").length}` },
                                { what: "Findings with a risk on the risks page", result: `${facts.filter((f) => f.body.risk).length} of ${facts.filter((f) => f.body.risk).length}` },
                                { what: "Review files read (current files only), unreadable lines", result: `${run.reviewFiles} files, ${run.badLines} unreadable lines` },
                                { what: "Reviewers' missing notes shown on stage pages", result: `${run.missed.length}` },
                                { what: "Challenged records no longer in the analysis", result: `${run.dropped.length}` },
                            ]}
                        />
                    </Section>
                </>
            ),
        }),
    );
}

// ---------------------------------------------------------------- write
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const extraCss = `
.tile-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:var(--space-3,.75rem);margin:.5rem 0 1.25rem}
.tile{display:grid;gap:.4rem;align-content:start;padding:var(--space-3,.75rem) var(--space-4,1rem);background:var(--surface-raised);border:1px solid var(--line-subtle);border-radius:var(--radius-md);text-decoration:none;color:inherit}
.tile:hover,.tile:focus-visible{border-color:var(--accent-link)}
.tile h4{margin:0;font-size:1rem}
.tile p{margin:0;font-size:.875rem;color:var(--text-secondary)}
.chips{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;padding:0;margin:.25rem 0 .75rem}
.chips li{border:1px solid var(--line-subtle);border-radius:1rem;padding:.1rem .65rem;font-size:.875rem;background:var(--surface-raised)}
.search{width:100%;max-width:36rem;padding:.5rem .75rem;font:inherit;border:1px solid var(--line-subtle);border-radius:var(--radius-md);background:var(--surface-raised);color:inherit}
.search-results{list-style:none;padding:0;margin:0 0 1rem;max-width:48rem}
.search-results li{padding:.35rem 0;border-block-end:1px solid var(--line-subtle);font-size:.9rem}
.search-results small{color:var(--text-muted);margin-inline-end:.5rem}
.review-note{margin:.25rem 0}
`;
const extraJs = String.raw`
;(function(){
  var script=document.currentScript; var base=script&&script.src?script.src.replace(/page\.js[^/]*$/,''):'';
  var root=base.replace(/assets\/$/,'');
  var input=document.getElementById('q'), out=document.getElementById('q-results'), loaded=false, waiting=null;
  function run(){
    var q=input.value.trim().toLowerCase(); out.innerHTML=''; if(q.length<2||!window.SEARCH_INDEX) return;
    var terms=q.split(/\s+/), hits=[];
    for(var i=0;i<window.SEARCH_INDEX.length&&hits.length<200;i++){
      var e=window.SEARCH_INDEX[i], t=e[1].toLowerCase(), ok=true, score=0;
      for(var k=0;k<terms.length;k++){var at=t.indexOf(terms[k]); if(at<0){ok=false;break;} score+=at;}
      if(ok) hits.push([score,e]);
    }
    hits.sort(function(a,b){return a[0]-b[0]});
    hits.slice(0,30).forEach(function(h){
      var li=document.createElement('li'), s=document.createElement('small'), a=document.createElement('a');
      s.textContent=h[1][0]; a.textContent=h[1][1].length>140?h[1][1].slice(0,140)+'…':h[1][1]; a.href=root+h[1][2];
      li.appendChild(s); li.appendChild(a); out.appendChild(li);
    });
    if(!hits.length){var li=document.createElement('li'); li.textContent='Nothing found.'; out.appendChild(li);}
  }
  if(input&&out){
    input.addEventListener('input',function(){
      if(!loaded){loaded=true; var sc=document.createElement('script'); sc.src=base+'search-index.js'; sc.onload=run; document.head.appendChild(sc);} else run();
    });
  }
  document.querySelectorAll('input[data-filter]').forEach(function(f){
    var box=document.getElementById(f.getAttribute('data-filter')); if(!box) return;
    f.addEventListener('input',function(){
      var q=f.value.trim().toLowerCase();
      box.querySelectorAll('tbody tr').forEach(function(r){ r.style.display=(q===''||r.innerText.toLowerCase().indexOf(q)>=0)?'':'none'; });
    });
  });
})();
`;
for (const file of assetFiles()) {
    mkdirSync(dirname(join(out, file.path)), { recursive: true });
    const text = file.path.endsWith("page.css") ? `${file.text}\n${extraCss}` : file.path.endsWith("page.js") ? `${file.text}\n${extraJs}` : file.text;
    writeFileSync(join(out, file.path), text);
}
// the search index: kind, text, root-relative address
{
    const entries: [string, string, string][] = [];
    for (const c of capabilities) entries.push(["Capability", `${c.body.name}: ${firstSentence(c.body.purpose)}`, capPage.get(c.id) as string]);
    for (const e of entities) entries.push(["Kind of data", `${e.body.name}: ${firstSentence(e.body.purpose)}`, entPage.get(e.id) as string]);
    for (const x of parts) entries.push(["Part", `${x.body.name}: ${firstSentence(x.body.purpose)}`, partPage.get(x.id) as string]);
    for (const f of facts) entries.push(["Finding", plain(f.body.statement), `findings.html#${f.id}`]);
    for (const r of rules) entries.push(["Rule", plain(r.body.says), `${ruleHome.get(r.id) ?? "rules.html"}#${r.id}`]);
    for (const r of pageRows.values()) {
        const lead = r.eps.find((e) => e.name === r.file.split("/").pop()) ?? (r.eps[0] as EpRow);
        entries.push(["Page", `${r.file} ${firstSentence(plain(lead.purpose))}`, `${codeMapOf(lead.id) ?? "code-index.html"}#${lead.id}`]);
    }
    for (const e of epRows) entries.push(["Entry point", `${e.name} (${e.file}) ${firstSentence(plain(e.purpose))}`, `${codeMapOf(e.id) ?? "code-index.html"}#${e.id}`]);
    writeFileSync(join(out, "assets/search-index.js"), `window.SEARCH_INDEX=${JSON.stringify(entries)};\n`);
}
for (const [path, text] of pages) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), text);
}
console.log(`wrote ${pages.size} pages to ${out}`);
for (const r of coverageRows) console.log(`${r.type.padEnd(22)} store ${String(r.stored).padStart(6)}  pages ${String(r.shown).padStart(6)}  ${r.stored === r.shown ? "ok" : "GAP"}`);
console.log(`links checked ${linkCount}, broken ${brokenLinks.length}; leaks ${leaks.length}; unreadable files ${unreadable.length}`);
for (const b of brokenLinks.slice(0, 20)) console.log(`  broken: ${b}`);
for (const l of leaks.slice(0, 20)) console.log(`  leak: ${l}`);
if (gaps.length > 0 || brokenLinks.length > 0 || leaks.length > 0) process.exitCode = 1;
