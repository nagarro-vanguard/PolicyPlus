import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import type { Plan, StoryView } from "../model/plan";
import type { ModernizationRequest } from "../model/request";
import type { Target } from "../read/target";
import { storyBody } from "./bodies";
import type { Facts, Place } from "./facts";
import { componentLayer } from "./layers";

/** The most bytes a story's context holds: what must be kept comes first, then as much of the reading as fits. */
export const CEILING = 40_000;

/** The reading's sections in the order they are cut when the document is too long; what to doubt goes last. */
const CUT = ["Relied on: decided elsewhere", "Data and states", "Boundary", "Contract: what it must do", "Trust: what to doubt"];

/** A reader of the legacy code the request names: its lines by file, or nothing for a file that is not there. */
export const sourceReaderOf = (roots: readonly string[]) => {
    const files = new Map<string, string[] | null>();
    const lines = (file: string): string[] | null => {
        if (files.has(file)) return files.get(file) ?? null;
        let read: string[] | null = null;
        for (const root of roots) {
            const full = normalize(join(root, file));
            try {
                if (full.startsWith(normalize(root) + sep) && statSync(full).isFile()) {
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
    return { readable: roots.some((root) => existsSync(root)), lines };
};
export type SourceReader = ReturnType<typeof sourceReaderOf>;

export type ContextInputs = {
    readonly plan: Plan;
    readonly facts: Facts;
    readonly request: ModernizationRequest;
    readonly target: Target | undefined;
    readonly source: SourceReader;
    /** The reading of each surface the story's entry points belong to: its title and its text. */
    readonly readings: readonly { readonly title: string; readonly text: string }[];
};

const at = (place: Place) => `${place.file}:${place.firstLine}-${place.lastLine}`;
const bytes = (text: string) => Buffer.byteLength(text);
const ID = /\b[a-z]+(?:-[a-z]+)*-\d{8,}\b/g;

/** Merges the places that overlap or touch, per file, in file and line order. */
const merged = (places: readonly Place[]): Place[] => {
    const out: Place[] = [];
    for (const place of [...places].sort(
        (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || a.firstLine - b.firstLine,
    )) {
        const last = out.at(-1);
        if (last?.file === place.file && place.firstLine <= last.lastLine + 1)
            out[out.length - 1] = { ...last, lastLine: Math.max(last.lastLine, place.lastLine) };
        else out.push(place);
    }
    return out;
};

/** A fence longer than any run of backticks the code holds. */
const fenced = (lines: readonly string[]) => {
    const longest = Math.max(0, ...lines.flatMap((line) => [...line.matchAll(/`+/g)].map((run) => run[0].length)));
    const fence = "`".repeat(Math.max(3, longest + 1));
    return [fence, ...lines, fence].join("\n");
};

/** The ids and cross-references the reading carries for the analysis's own use; nothing a person reads. */
const WORDS = /\*{0,2}\b(?:BR|ACT|TR|RK)-\d+\b\*{0,2}\s?|\s*\(bundle: [^)]*\)/g;
/** Sections of the reading that repeat what this context holds: the code and the table of files. */
const REPEATED = new Set(["Source", "Read order"]);
const cellsOf = (line: string) =>
    line
        .replace(/^\s*\||\|\s*$/g, "")
        .split("|")
        .map((cell) => cell.trim());

/**
 * Splits a reading at its `##` headings outside fenced code and lowers each heading one level. What repeats this
 * context is left out, a diagram is left out, and a table is said as labelled lines.
 */
const readingSections = (text: string, plain: (text: string) => string) => {
    const sections: { title: string; body: string[] }[] = [];
    let open: string | undefined;
    let diagram = false;
    let head: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
        const fence = /^\s*(```|~~~)(\w*)/.exec(raw);
        if (open === undefined && fence !== null) ((open = fence[1]), (diagram = fence[2] === "mermaid"));
        else if (open !== undefined && raw.trim().startsWith(open)) {
            open = undefined;
            if (diagram) {
                diagram = false;
                continue;
            }
        }
        if (diagram) continue;
        const heading = open === undefined ? /^(#{1,6})(\s.*)$/.exec(raw) : null;
        const line = open === undefined ? plain(raw.replace(WORDS, "")) : raw;
        const row = open === undefined && /^\s*\|/.test(raw);
        const inner = sections.at(-1)?.body;
        if (heading?.[1] === "##") sections.push({ title: (heading[2] ?? "").trim(), body: [] });
        else if (heading?.[1] === "#") continue;
        else if (row && /^[\s:|-]+$/.test(raw)) continue;
        else if (row && head.length === 0) head = cellsOf(line);
        else if (row)
            inner?.push(
                `- ${cellsOf(line)
                    .flatMap((cell, at) => (cell === "" ? [] : [`${head[at]}: ${cell}`]))
                    .join("; ")}`,
            );
        else {
            head = [];
            inner?.push(heading === null ? line : `${"#".repeat(Math.min(6, heading[1]!.length + 1))}${heading[2]}`);
        }
    }
    return sections
        .filter((each) => !REPEATED.has(each.title))
        .map((each) => ({ title: each.title, body: each.body.join("\n").trim() }));
};

/**
 * One story's context as markdown for a person to read: the story as the tracker holds it, then the evidence a builder
 * needs, then the reading of the existing code, within the ceiling. Written once, here; nothing else words it.
 * @param view the story
 * @param input the plan, the analysis facts, the request, the target, the legacy code and the readings
 * @returns the text, and each reason it cannot be trusted
 */
export const contextOf = (view: StoryView, input: ContextInputs) => {
    const { plan, facts, request, target, source, readings } = input;
    const problems: string[] = [];
    const fail = (text: string) => problems.push(`story "${view.title}": ${text}`);
    const titleOf = new Map(plan.stories.map((story) => [story.key as string, story.title]));
    const layerBy = new Map(plan.layers.map((layer) => [layer.id as string, layer]));
    const decisionBy = new Map(plan.decisions.map((decision) => [decision.id as string, decision]));
    const stepBy = new Map(
        (target?.journeys ?? []).flatMap((j) => j.steps.map((step) => [step.id, { step, j }] as const)),
    );
    const plain = (text: string) =>
        text
            .replace(/\s*\([^()]*\b[a-z]+(?:-[a-z]+)*-\d{8,}\b[^()]*\)/g, "")
            .replace(ID, (id) => facts.rules.get(id)?.says.split(/(?<=\.)\s/)[0] ?? "another finding");

    // The rules, numbered: those it builds, then those it only relies on.
    const relied = view.reliesOn.filter((each) => !view.builds.includes(each.rule));
    const ruleIds = [...view.builds, ...relied.map((each) => each.rule)] as string[];
    const number = new Map(ruleIds.map((id, at) => [id, at + 1]));
    for (const id of ruleIds) if (!facts.rules.has(id)) fail("a rule it builds or relies on is not in the analysis");
    const topic = (decision: Plan["decisions"][number]) =>
        decision.topic._tag === "integration"
            ? `Outside system ${decision.topic.system}`
            : decision.topic._tag === "scope"
              ? `Scope of ${decision.topic.capability}`
              : decision.topic._tag === "note"
                ? `Note ${decision.topic.number} of the request`
                : decision.topic._tag === "area"
                  ? decision.topic.name
                  : `Convention for ${decision.layer === "workspace" ? "every layer" : (layerBy.get(decision.layer)?.name ?? decision.layer)}`;

    // The criteria, in the order of the body: what each rests on, in words.
    const citedDecisions: string[] = [];
    const citedLayers: string[] = [];
    const criteria = view.criteria.flatMap((criterion, order) => {
        const found: Record<string, string[]> = {
            Rules: [],
            Decisions: [],
            Layers: [],
            Steps: [],
            "Changes of state": [],
        };
        for (const ref of criterion.from) {
            const miss = () => fail(`criterion ${order + 1} rests on a ${ref._tag} that does not exist`);
            if (ref._tag === "rule")
                number.has(ref.id)
                    ? found.Rules?.push(String(number.get(ref.id)))
                    : fail(`criterion ${order + 1} cites a rule it neither builds nor relies on`);
            else if (ref._tag === "decision") {
                const decision = decisionBy.get(ref.id);
                if (decision === undefined) miss();
                else (found.Decisions?.push(topic(decision)), citedDecisions.push(ref.id));
            } else if (ref._tag === "layer") {
                const layer = layerBy.get(ref.id);
                if (layer === undefined) miss();
                else (found.Layers?.push(layer.name), citedLayers.push(ref.id));
            } else if (ref._tag === "step") {
                const known = stepBy.get(ref.id);
                known === undefined ? miss() : found.Steps?.push(known.step.intent);
            } else {
                const change = facts.transitions.find((each) => each.id === ref.id);
                change === undefined
                    ? miss()
                    : found["Changes of state"]?.push(`${change.entityName}: ${change.from} to ${change.to}`);
            }
        }
        const said = Object.entries(found).flatMap(([label, list]) =>
            list.length === 0 ? [] : [`${label}: ${list.join("; ")}.`],
        );
        return said.length === 0 ? [] : [`- AC-${order + 1}. ${said.join(" ")}`];
    });
    const cited = new Set(
        view.criteria.flatMap((criterion) =>
            criterion.from.flatMap((ref) => (ref._tag === "rule" ? [ref.id as string] : [])),
        ),
    );

    // The rules it builds, and the doubt the analysis holds about them.
    const built = view.builds.flatMap((id) => {
        const fact = facts.rules.get(id);
        if (fact === undefined) return [];
        const gated = facts.transitions.find((each) => each.id === fact.gates);
        return [
            [
                `### Rule ${number.get(id)}`,
                "",
                `Says: ${fact.says}`,
                `Where: ${at(fact.place)}`,
                ...(fact.alsoRestsOn.length === 0 ? [] : [`Also rests on: ${fact.alsoRestsOn.map(at).join("; ")}`]),
                ...(fact.doubt === "" ? [] : [`Doubt: ${plain(fact.doubt)}`]),
                ...(gated === undefined
                    ? []
                    : [`Gates the change of state: ${gated.entityName}: ${gated.from} to ${gated.to}`]),
                ...(cited.has(id) ? [] : ["No criterion cites it."]),
            ].join("\n"),
        ];
    });
    // Rules built by another story are named under that story, once.
    const reliedBlocks = [...new Set(relied.map((each) => each.builtBy))].map((key) =>
        [
            `### Built by: ${titleOf.get(key) ?? "no story of the plan"}`,
            "",
            ...relied.flatMap((each) => {
                const fact = facts.rules.get(each.rule);
                return each.builtBy !== key || fact === undefined
                    ? []
                    : [`- Rule ${number.get(each.rule)}: ${fact.says} (${at(fact.place)})`];
            }),
        ].join("\n"),
    );

    const decisions = [...new Set(citedDecisions)].flatMap((id) => {
        const decision = decisionBy.get(id);
        return decision === undefined
            ? []
            : [[`### ${topic(decision)}`, "", `Chose: ${decision.chose}`, `Why: ${decision.reason}`].join("\n")];
    });
    const layerIds = new Set([
        ...(view.layers ?? []),
        ...citedLayers,
        ...citedDecisions.map((id) => decisionBy.get(id)?.layer ?? ""),
    ]);
    const layers = plan.layers
        .filter((layer) => layerIds.has(layer.id))
        .map((layer) =>
            [
                `### ${layer.name}`,
                "",
                `Path: ${layer.path}`,
                `Purpose: ${layer.purpose}`,
                `Check: ${layer.check}`,
                ...(layer.carries.length === 0
                    ? []
                    : [
                          `Carries: ${layer.carries
                              .map((n) => request.stack[n - 1] ?? "")
                              .filter(Boolean)
                              .join("; ")}`,
                      ]),
            ].join("\n"),
        );

    // The steps and components of the confirmed target it builds, or only their names when that is all the plan holds.
    const steps = [...new Set(view.steps ?? [])].flatMap((id) => {
        const known = stepBy.get(id);
        if (known === undefined) return [];
        const { step, j } = known;
        const kept = (step.changes ?? []).map(
            (change) =>
                `${number.has(change.rule) ? `Rule ${number.get(change.rule)}` : (facts.rules.get(change.rule)?.says ?? "A rule of today")}: ${change.to}`,
        );
        return [
            [
                `### Step: ${step.intent}`,
                "",
                `Journey: ${j.name}`,
                `Against today: ${step.link._tag === "legacy" ? step.link.change : "new"}; ${step.link.reason}`,
                `The system: ${step.system}`,
                ...(kept.length === 0 ? [] : [`It changes: ${kept.join("; ")}`]),
            ].join("\n"),
        ];
    });
    const components = (view.components ?? []).map((name) => {
        const component = target?.architecture.components.find((each) => each.name === name);
        if (component === undefined || target === undefined) return `### Component: ${name}`;
        const layer = componentLayer(name, {
            layers: plan.layers,
            decisions: plan.decisions,
            target,
            externals: facts.externals,
        });
        return [
            `### Component: ${name}`,
            "",
            `Does: ${component.responsibility}`,
            `Module: ${component.module}`,
            ...(layer === undefined ? [] : [`Built in: ${layer.path}`]),
        ].join("\n");
    });

    // Every place a rule cites is in the code.
    const mine = view.builds.flatMap((id) => {
        const fact = facts.rules.get(id);
        return fact === undefined ? [] : [fact.place, ...fact.alsoRestsOn];
    });
    if (source.readable)
        for (const place of [...mine, ...relied.flatMap((each) => facts.rules.get(each.rule)?.place ?? [])])
            if (
                place.firstLine < 1 ||
                place.lastLine < place.firstLine ||
                place.lastLine > (source.lines(place.file)?.length ?? 0)
            )
                fail(`${at(place)} is not in the analysed code`);

    const ranges = merged(mine);
    const blocks = ranges.map((range) => {
        const lines = source.lines(range.file)?.slice(range.firstLine - 1, range.lastLine);
        return `${at(range)}\n\n${lines === undefined ? "This place could not be read." : fenced(lines)}`;
    });
    const section = (title: string, parts: readonly string[], intro?: string) =>
        parts.length === 0 ? [] : [`## ${title}`, ...(intro === undefined ? [] : [intro]), ...parts];
    const before = [
        `# ${view.title}`,
        storyBody(view, plan),
        ...section(
            "Criteria and their rules",
            criteria.length === 0 ? [] : [criteria.join("\n")],
            "AC-1 is the first acceptance criterion above, AC-2 the second, and so on. A number names a rule below.",
        ),
        ...section("Rules built", built),
        ...section("Rules relied on", reliedBlocks),
        ...section("Decisions", decisions),
        ...section("Layers", layers),
        ...section("Target steps and components", [...steps, ...components]),
    ];
    // A section several surfaces share is said once; two that differ carry the name of their surface.
    const all = readings.flatMap((reading) =>
        readingSections(reading.text, plain).map((each) => ({ ...each, surface: reading.title })),
    );
    const sections = all
        .filter((each, at) => all.findIndex((other) => other.body === each.body) === at)
        .map((each, _, kept) => {
            const title =
                kept.filter((other) => other.title === each.title).length > 1
                    ? `${each.title}: ${each.surface}`
                    : each.title;
            return { title, text: `### ${title}\n\n${each.body}` };
        });
    const sourcePart = (n: number) =>
        ranges.length === 0
            ? []
            : !source.readable
              ? [
                    "## Source",
                    "The analysed code could not be read when this was written, so its code is not included. The places the rules cite:",
                    ranges.map((range) => `- ${at(range)}`).join("\n"),
                ]
              : [
                    "## Source",
                    ...(n === 0
                        ? []
                        : [
                              "The code of the rules this story builds, verbatim, one block per place; overlapping places are merged.",
                              ...blocks.slice(0, n),
                          ]),
                    ...(n === blocks.length
                        ? []
                        : [
                              `Not included here to keep this document short, at a place boundary: ${ranges.slice(n).map(at).join("; ")}.`,
                          ]),
                ];
    const render = (n: number, kept: readonly string[], left: readonly string[]) =>
        `${[
            ...before,
            ...sourcePart(n),
            ...(sections.length === 0
                ? []
                : [
                      "## Reading of the existing code",
                      ...(left.length === 0 ? [] : [`Not included here to keep this document short: ${left.join("; ")}.`]),
                      ...kept,
                  ]),
        ].join("\n\n")}\n\nMade from analysis ${plan.analysis.fingerprint}.\n`;
    // What must be kept comes first: the evidence, then the code, then the reading, least useful sections cut first.
    let n = blocks.length;
    while (source.readable && n > 0 && bytes(render(n, [], sections.map((each) => each.title))) > CEILING) n--;
    const rank = (title: string) => {
        const at = CUT.findIndex((name) => title === name || title.startsWith(`${name}: `));
        return at < 0 ? CUT.length - 1.5 : at;
    };
    const order = sections.map((_, at) => at).sort((a, b) => rank(sections[a]!.title) - rank(sections[b]!.title) || b - a);
    const cut = new Set<number>(n === blocks.length ? [] : order);
    const draw = () =>
        render(
            n,
            sections.filter((_, at) => !cut.has(at)).map((each) => each.text),
            sections.filter((_, at) => cut.has(at)).map((each) => each.title),
        );
    for (const at of order) if (bytes(draw()) > CEILING) cut.add(at);
    const left = sections.filter((_, at) => cut.has(at)).map((each) => each.title);
    const text = draw();
    for (const id of ruleIds) {
        const says = facts.rules.get(id)?.says;
        if (says !== undefined && !text.includes(says)) fail("a rule it builds or relies on is not in its context");
    }
    return { text, problems, cutSource: blocks.length - n, left };
};
