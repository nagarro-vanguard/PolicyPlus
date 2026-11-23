import { copy } from "../lib/copy";
import { counted, countOf, type CountView, heading, kilobytes } from "./format";
import type { Case } from "./read";
import { addressOf } from "./routes";
import type { Section } from "./sections";
import type { CaseData } from "./view";

// What the Plan section shows, read from the case's `plan/` files and followed by key into the journeys, the
// architecture and the facts. Like view.ts it only follows keys the case gives and takes the length of a list the case
// holds; it never counts across files or infers. Stories are addressed on the page by their place in the plan's order
// (`#story=12`), never by their key, so no address or text carries the plan's bookkeeping.

type Story = {
    key: string;
    title: string;
    what: string;
    why: string;
    kind: string;
    phase: number;
    epic: string;
    sequence: number;
    blockedBy: string[];
    unblocks: string[];
    builds: string[];
    reliesOn: string[];
    steps: string[];
    components: string[];
    domains: string[];
    layers: string[];
    criteria: { says: string; given: string | null; when: string | null; then: string | null; from: { kind: string; id: string }[] }[];
    open: string[];
    challenges: string[];
};
type Epic = { key: string; label: string; sequence: number; stories: string[] };
type Phase = { number: number; name: string; why: string; stories: string[]; epics: string[]; builtIn: string[] };
type Layer = { id: string; name: string };
type Matrix = {
    journeys: string[];
    domains: string[];
    cells: { journey: string; domain: string; steps: string[]; stories: string[] }[];
    rowTotals: Record<string, number>;
    columnTotals: Record<string, number>;
    total: number;
};
type ProposedJourney = { id: string; task: string; name: string; steps: { id: string; number: number; intent: string }[] };
type TodayJourney = { id: string; slug: string; title: string };
type Trace = { step: string; changed: { rule: string; to: string }[] };
type Dropped = { journey: string; actions: string[]; rules: string[]; reason: string };

export type PlainLink = { name: string; href?: string };

export type StoryView = {
    n: number;
    title: string;
    what: string;
    why: string;
    kind: string;
    kindLabel: string;
    criteria: { says: string; given: string | null; when: string | null; then: string | null; rules: PlainLink[] }[];
    open: string[];
    phase: number;
    epic: number;
    epicLabel: string;
    domains: number[];
    domainNames: string[];
    components: string[];
    layers: string[];
    blockedBy: { n: number; title: string }[];
    unblocks: { n: number; title: string }[];
    unblocksText: string | null;
    waitsText: string | null;
    rules: { name: string; href?: string; place: string; changedTo: string | null }[];
    reliesOn: PlainLink[];
    steps: { journey: PlainLink; number: number; of: number; intent: string }[];
    brief: { file: string; kilobytes: number } | null;
    text: string;
};

export type MatrixView = {
    domains: { index: number; name: string }[];
    rows: { name: string; cells: ({ id: string; stories: number[]; label: string } | null)[]; steps: number }[];
    columnSteps: number[];
    total: number;
    lines: string[];
};

export type PlanView = {
    /** True when the plan says it was built before the latest decisions or analysis. */
    stale: boolean;
    structure: string;
    phases: { number: number; why: string; builtIn: string[]; epics: string[]; stories: number }[];
    matrix: MatrixView | null;
    stories: StoryView[];
    filters: {
        phases: { value: string; label: string }[];
        epics: { value: string; label: string }[];
        domains: { value: string; label: string }[];
        kinds: { value: string; label: string }[];
    };
    notCovered: {
        dropped: { journey: PlainLink; reason: string; items: PlainLink[] }[];
        unplaced: { href: string; counts: CountView[] } | null;
        unplanned: { title: string; items: { name: string; place: string }[] } | null;
    };
    storyNoun: { one: string; many: string };
};

/** The file a story's text for an assistant is written to, below the site's root. */
export const storyBriefFileOf = (n: number) => `plan/brief/${n}.txt`;

/**
 * The Plan section's view, or null when the case holds no plan.
 * @param kase the case
 * @param data the case's records by key
 * @param sections the sections present, to link only to pages a reader can open
 * @returns the view
 */
export const planViewOf = (kase: Case, data: CaseData, sections: readonly Section[]): PlanView | null => {
    const read = <T>(path: string, fallback: T): T => (kase.has(path) ? ((kase.json(path) as T | null) ?? fallback) : fallback);
    const stories = read<Story[]>("plan/stories.json", []);
    if (stories.length === 0) return null;
    const epics = read<Epic[]>("plan/epics.json", []);
    const phases = read<Phase[]>("plan/phases.json", []);
    const layers = read<Layer[]>("plan/layers.json", []);
    const matrix = read<Matrix | null>("plan/matrix.json", null);
    const proposed = read<ProposedJourney[]>("journeys/proposed.json", []);
    const today = read<TodayJourney[]>("journeys/today.json", []);
    const traces = read<Trace[]>("journeys/trace.json", []);
    const dropped = read<Dropped[]>("journeys/dropped.json", []);
    const architecture = read<{ domains: { name: string }[] } | null>("architecture.json", null);
    const sizes = read<Record<string, Record<string, number>>>("assistant/index.json", {}).story ?? {};
    const stale = read<boolean | null>("plan/stale.json", null) === true;
    const unplanned = read<{ name: string; file: string; firstLine: number; lastLine: number }[]>("plan/unplanned.json", []);

    const levelOf = (key: string) => data.node(key)?.level;
    const nodeLink = (key: string, name?: string): PlainLink => {
        const node = data.node(key);
        if (node === undefined) return { name: name ?? "" };
        return { name: name ?? node.name, href: addressOf(node, levelOf) };
    };
    const factLink = (collection: string, level: string, id: string, field: string): PlainLink => {
        const fact = data.fact(collection, id);
        if (fact === undefined) return { name: "" };
        return nodeLink(`${level}/${String(fact.slug)}`, String(fact[field]));
    };

    const storyByKey = new Map(stories.map((story) => [story.key, story]));
    const epicByKey = new Map(epics.map((epic) => [epic.key, epic]));
    const layerName = new Map(layers.map((layer) => [layer.id, layer.name]));
    const domainOrder = architecture?.domains.map((domain) => domain.name) ?? matrix?.domains.filter((name) => name !== "") ?? [];
    const domainIndex = new Map(domainOrder.map((name, at) => [name, at]));
    const journeysBuilt = sections.some((section) => section.id === "journeys" && section.built);
    const todayById = new Map(today.map((journey) => [journey.id, journey]));
    const journeyLink = (journey: ProposedJourney): PlainLink => {
        const page = todayById.get(journey.task);
        return journeysBuilt && page !== undefined ? { name: journey.name, href: `journey/${page.slug}.html` } : { name: journey.name };
    };
    const stepOf = new Map(proposed.flatMap((journey) => journey.steps.map((step) => [step.id, { journey, step }] as const)));
    const traceOf = new Map(traces.map((trace) => [trace.step, trace]));

    const storiesNumber = data.number("plan/stories");
    const storyNoun = storiesNumber?.noun ?? { one: "story", many: "stories" };
    const kindLabel = (kind: string) => {
        const part = storiesNumber?.parts?.find((each) => each.kind === kind);
        return part === undefined ? kind : heading(part.noun.one);
    };
    const linked = (keys: readonly string[]) =>
        keys.flatMap((key) => {
            const other = storyByKey.get(key);
            return other === undefined ? [] : [{ n: other.sequence, title: other.title }];
        });

    const storyViews = [...stories]
        .sort((a, b) => a.phase - b.phase || a.sequence - b.sequence)
        .map((story): StoryView => {
            const epic = epicByKey.get(story.epic);
            const changes = new Map(story.steps.flatMap((step) => (traceOf.get(step)?.changed ?? []).map((change) => [change.rule, change.to] as const)));
            const rules = story.builds.map((id) => {
                const rule = data.fact("rules", id) as { slug: string; says: string; place: { file: string; firstLine: number; lastLine: number } } | undefined;
                if (rule === undefined) return { name: "", place: "", changedTo: null };
                const link = nodeLink(`rule/${rule.slug}`, rule.says);
                const lines = rule.place.firstLine === rule.place.lastLine ? `${rule.place.firstLine}` : `${rule.place.firstLine}-${rule.place.lastLine}`;
                return { ...link, place: `${rule.place.file}:${lines}`, changedTo: changes.get(id) ?? null };
            });
            const steps = story.steps.flatMap((id) => {
                const found = stepOf.get(id);
                return found === undefined
                    ? []
                    : [{ journey: journeyLink(found.journey), number: found.step.number, of: found.journey.steps.length, intent: found.step.intent }];
            });
            const size = sizes[story.key];
            const unblocks = linked(story.unblocks);
            const blockedBy = linked(story.blockedBy);
            return {
                n: story.sequence,
                title: story.title,
                what: story.what,
                why: story.why,
                kind: story.kind,
                kindLabel: kindLabel(story.kind),
                criteria: story.criteria.map((criterion) => ({
                    says: criterion.says,
                    given: criterion.given,
                    when: criterion.when,
                    then: criterion.then,
                    rules: criterion.from
                        .filter((each) => each.kind === "rule")
                        .map((each) => {
                            const rule = data.fact("rules", each.id) as { slug: string; says: string } | undefined;
                            return rule === undefined ? { name: "" } : nodeLink(`rule/${rule.slug}`, rule.says);
                        })
                        .filter((link) => link.name !== ""),
                })),
                open: [...story.open, ...story.challenges],
                phase: story.phase,
                epic: epic?.sequence ?? 0,
                epicLabel: epic?.label ?? "",
                domains: story.domains.flatMap((name) => {
                    const at = domainIndex.get(name);
                    return at === undefined ? [] : [at];
                }),
                domainNames: story.domains,
                components: story.components,
                layers: story.layers.map((id) => layerName.get(id) ?? "").filter((name) => name !== ""),
                blockedBy,
                unblocks,
                unblocksText: unblocks.length === 0 ? null : copy.plan.unblocks(counted(unblocks.length, storyNoun)),
                waitsText: blockedBy.length === 0 ? null : copy.plan.waitsFor(counted(blockedBy.length, storyNoun)),
                rules: rules.filter((rule) => rule.name !== ""),
                reliesOn: story.reliesOn
                    .map((id) => {
                        const rule = data.fact("rules", id) as { slug: string; says: string } | undefined;
                        return rule === undefined ? { name: "" } : nodeLink(`rule/${rule.slug}`, rule.says);
                    })
                    .filter((link) => link.name !== ""),
                steps,
                brief: size === undefined ? null : { file: storyBriefFileOf(story.sequence), kilobytes: kilobytes(size) },
                text: `${story.title} ${story.what}`.toLowerCase(),
            };
        });

    const matrixView = ((): MatrixView | null => {
        if (matrix === null || matrix.journeys.length === 0) return null;
        const byId = new Map(proposed.map((journey) => [journey.id, journey]));
        const columns = matrix.domains
            .map((name, index) => ({ index, name: name === "" ? copy.plan.noComponent : name, raw: name }))
            .filter((column) => column.raw !== "" || (matrix.columnTotals[""] ?? 0) > 0);
        const cells = new Map(matrix.cells.map((cell) => [`${cell.journey}\u0000${cell.domain}`, cell]));
        const lines: string[] = [];
        const rows = matrix.journeys.map((id, row) => {
            const name = byId.get(id)?.name ?? id;
            return {
                name,
                steps: matrix.rowTotals[id] ?? 0,
                cells: columns.map((column) => {
                    const cell = cells.get(`${id}\u0000${column.raw}`);
                    if (cell === undefined) return null;
                    const numbers = linked(cell.stories).map((each) => each.n);
                    const label = `${name}, ${column.name}: ${counted(numbers.length, storyNoun)}`;
                    lines.push(label);
                    return { id: `${row}.${column.index}`, stories: numbers, label };
                }),
            };
        });
        return {
            domains: columns.map((column) => ({ index: domainIndex.get(column.raw) ?? -1, name: column.name })),
            rows,
            columnSteps: columns.map((column) => matrix.columnTotals[column.raw] ?? 0),
            total: matrix.total,
            lines,
        };
    })();

    const number = (key: string) => {
        const entry = data.number(key);
        return entry === undefined ? undefined : countOf(entry);
    };
    const phasesNumber = number("plan/phases");
    const epicsNumber = number("plan/epics");
    const structure =
        phasesNumber !== undefined && epicsNumber !== undefined && storiesNumber !== undefined
            ? copy.plan.structure(phasesNumber.text, epicsNumber.text, countOf(storiesNumber).text)
            : "";

    const phaseViews = [...phases]
        .sort((a, b) => a.number - b.number)
        .map((phase) => {
            return {
                number: phase.number,
                why: phase.why,
                builtIn: phase.builtIn,
                epics: phase.epics.map((key) => epicByKey.get(key)?.label ?? "").filter((label) => label !== ""),
                stories: phase.stories.length,
            };
        });

    const unplacedNode = data.node("unplaced");
    const unplacedCounts = (unplacedNode?.facts ?? []).flatMap((key) => {
        const entry = data.number(key);
        return entry === undefined || entry.value === 0 ? [] : [countOf(entry)];
    });
    const proposedById = new Map(proposed.map((journey) => [journey.id, journey]));

    const unplannedNumber = data.number("plan/unplanned");
    return {
        stale,
        structure,
        phases: phaseViews,
        matrix: matrixView,
        stories: storyViews,
        filters: {
            phases: phaseViews.map((phase) => ({ value: String(phase.number), label: copy.plan.phase(phase.number) })),
            epics: [...epics].sort((a, b) => a.sequence - b.sequence).map((epic) => ({ value: String(epic.sequence), label: epic.label })),
            domains: domainOrder.map((name, at) => ({ value: String(at), label: name })),
            kinds: (data.number("plan/stories")?.parts ?? []).map((part) => ({ value: part.kind, label: part.noun.one })),
        },
        notCovered: {
            dropped: dropped.map((drop) => {
                const journey = proposedById.get(drop.journey);
                return {
                    journey: journey === undefined ? { name: "" } : journeyLink(journey),
                    reason: drop.reason,
                    items: [
                        ...drop.actions.map((id) => factLink("actions", "action", id, "summary")),
                        ...drop.rules.map((id) => factLink("rules", "rule", id, "says")),
                    ].filter((link) => link.name !== ""),
                };
            }),
            unplaced:
                unplacedNode === undefined || unplacedCounts.length === 0
                    ? null
                    : { href: addressOf(unplacedNode, levelOf), counts: unplacedCounts },
            unplanned:
                unplanned.length === 0 || unplannedNumber === undefined
                    ? null
                    : {
                          title: copy.plan.unplannedTitle(countOf(unplannedNumber).text),
                          items: unplanned.map((each) => ({
                              name: each.name,
                              place: `${each.file}:${each.firstLine === each.lastLine ? `${each.firstLine}` : `${each.firstLine}-${each.lastLine}`}`,
                          })),
                      },
        },
        storyNoun,
    };
};
