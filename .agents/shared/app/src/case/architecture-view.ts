import { copy } from "../lib/copy";
import { caseData } from "./data";
import { type DiagramView, diagramView } from "./diagram-view";
import { type CountView, countOf, heading } from "./format";
import { theCase } from "./loader";

// What the Architecture and Choices pages show, read from the case: today's diagrams and data, the chosen architecture,
// its alternatives, the request's stack lines, the open challenges and what changed since the person confirmed. The
// view follows the keys the case gives (an outside system's id, a journey's task, a domain's name) and never counts:
// every number is a key of numbers.json.

type Architecture = {
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string | null;
    domains: { name: string; slug: string; concept: string; why: string }[];
    containers: { name: string; kind: string; tech: string; holds: string[]; does: string | null; runsOn: string | null; runsOnWords: string | null }[];
    components: { name: string; domain: string; responsibility: string; adapts: string | null }[];
    integrations: { outside: string; name: string; domain: string; how: string }[];
    risks: { statement: string; summary: string; kind: string | null; cites: string[]; containedBy: string | null }[];
    talks: { from: string; to: string; uses: number }[];
    domainEdges: { from: string; to: string; uses: number }[];
    alternatives: {
        name: string;
        idea: string;
        tradeoff: string;
        containers: { name: string; kind: string }[];
        domains: { name: string }[];
        integrations: { outside: string; name: string }[];
    }[];
    landing: {
        layers: { layer: string | null; name: string; number: string }[];
        domains: string[];
        cells: { layer: string | null; domain: string; number: string }[];
    };
    unplaced: { rule: string; reason: string | null }[];
};
type Brief = { changes: { stack: { line: string; layers: string[] }[] } | null };
type Changed = { gate: string; state: string; since: { added: string[]; removed: string[]; changed: string[]; names?: Record<string, string> } | null };
type Conflict = { stage: string; variant: string; says: string; resolved: boolean | null };
type Outside = { id: string; kind: string; name: string };
type Entity = { name: string; purpose: string };
type TodayJourney = { id: string; title: string };
type ProposedJourney = { task: string; name: string; strategy: string; idea: string; tradeoff: string; recommended: string | null; alternatives: { name: string; strategy: string; idea: string; tradeoff: string }[] };

const read = <T>(path: string): T | null => {
    const kase = theCase();
    return kase.has(path) ? (kase.json(path) as T) : null;
};

/** A number of the case in words, or nothing when the case does not hold it. */
export const numberOf = async (key: string): Promise<CountView | null> => {
    const entry = (await caseData()).number(key);
    return entry === undefined ? null : countOf(entry);
};

export type Since = { added: string[]; removed: string[]; changed: string[] };

/** What changed in a decision since it was confirmed, with names in place of keys; nothing when nothing did. */
const sinceOf = (gate: string, nameOf: (key: string) => string | undefined): Since | null => {
    const changed = read<Changed[]>("journeys/changed.json")?.find((each) => each.gate === gate);
    const since = changed?.since ?? null;
    if (since === null) return null;
    // A key the case gives no name for (a journey since removed) is left out: a reader never sees a record's id.
    const names = (keys: readonly string[]) => keys.flatMap((key) => nameOf(key) ?? since.names?.[key] ?? []);
    const result = { added: names(since.added), removed: names(since.removed), changed: names(since.changed) };
    return result.added.length + result.removed.length + result.changed.length === 0 ? null : result;
};

/** Two lists of changes as one. */
const joined = (one: Since | null, other: Since | null): Since | null =>
    one === null ? other : other === null ? one : { added: [...one.added, ...other.added], removed: [...one.removed, ...other.removed], changed: [...one.changed, ...other.changed] };

export type RiskItem = { title: string; detail: string | null; about: string[]; containedBy: string | null };
export type Option = {
    name: string;
    idea: string;
    cost: string;
    chosen: boolean;
    why: string | null;
    /** The parts that run, the domains and where data lives, when the option's record keeps them. */
    parts: string[];
    domains: string[];
    data: string[];
};

export type LandingView = {
    caption: string;
    columns: string[];
    rows: { name: string; total: string; cells: { text: string; scope: string }[] }[];
    lines: string[];
};

export type TodayView = {
    organisation: DiagramView | null;
    context: DiagramView | null;
    data: DiagramView | null;
    entities: { name: string; line: string }[];
    stores: string[];
};

export type ProposedView = {
    name: string;
    idea: string;
    why: string | null;
    facts: CountView[];
    containers: { name: string; kind: string; does: string | null; runsOn: string | null; tech: string; holds: string[] }[];
    domainsDiagram: DiagramView | null;
    talksDiagram: DiagramView | null;
    domains: { name: string; concept: string; why: string; uses: string[]; usedBy: string[]; counts: string[] }[];
    components: { name: string; domain: string; does: string }[];
    stack: { label: string; line: string; carriedBy: string[] }[];
    outside: { name: string; kind: string | null; owner: string; how: string; through: string[] }[];
    risks: RiskItem[];
    questions: RiskItem[];
    landing: LandingView | null;
    unplaced: { title: string; scope: string; rules: { says: string; reason: string | null }[] } | null;
    options: Option[];
    challenges: { says: string; other: string | null }[];
    since: Since | null;
};

/** Today: the organisation, the context and where data lives. */
export const todayView = (): TodayView => {
    const outside = read<Outside[]>("facts/outside.json") ?? [];
    return {
        organisation: diagramView("organisation/system", { title: copy.architecture.organisation }),
        context: diagramView("context/system", { title: copy.architecture.context }),
        data: diagramView("data/system", { title: copy.architecture.data }),
        entities: (read<Entity[]>("facts/entities.json") ?? []).map((each) => ({ name: each.name, line: each.purpose })),
        stores: outside.filter((each) => each.kind === "dataStore").map((each) => each.name),
    };
};

const riskOf = (risk: Architecture["risks"][number]): RiskItem => ({
    title: risk.summary,
    detail: risk.statement === risk.summary ? null : risk.statement,
    about: risk.cites,
    containedBy: risk.containedBy,
});

/**
 * A stack line of the request as what it is for and what it names: the words before its first colon, when it has one,
 * say what the line is for.
 */
const stackLineOf = (line: string) => {
    const at = line.indexOf(": ");
    return at <= 0 ? { label: "", line } : { label: heading(line.slice(0, at)), line: line.slice(at + 2) };
};

/** The proposal, when the case holds an architecture. */
export const proposedView = async (): Promise<ProposedView | null> => {
    const architecture = read<Architecture>("architecture.json");
    if (architecture === null) return null;
    const brief = read<Brief>("brief.json");
    const outside = new Map((read<Outside[]>("facts/outside.json") ?? []).map((each) => [each.id, each]));
    const facts = (await Promise.all(["architecture/domains", "architecture/containers", "architecture/components"].map(numberOf))).filter(
        (each): each is CountView => each !== null,
    );
    const containerWords = (kind: string) => {
        const words = copy.diagram.groupWords[kind];
        if (words === undefined) throw new Error(`a part of the architecture is of a kind "${kind}" the app has no words for`);
        return words;
    };
    const conflicts = (read<Conflict[]>("plan/conflicts.json") ?? []).filter((each) => each.stage === "architecture" && each.resolved !== true);
    const data = await caseData();
    const valueOf = (key: string) => data.number(key);
    const served = valueOf("architecture/score/steps-served");
    const steps = valueOf("architecture/score/steps");
    const assigned = valueOf("architecture/score/rules-assigned");
    const scored = valueOf("architecture/score/rules");
    const score =
        served === undefined || steps === undefined || assigned === undefined || scored === undefined
            ? []
            : [
                  { text: copy.architecture.scoreSteps(countOf(served).text, countOf(steps).text), scope: served.scope, value: served.value },
                  { text: copy.architecture.scoreRules(countOf(assigned).text, countOf(scored).text), scope: assigned.scope, value: assigned.value },
              ];
    const domainSlug = new Map(architecture.domains.map((domain) => [domain.name, domain.slug]));
    const columnName = (domain: string) => (domain === "" ? copy.architecture.notPlaced : domain);
    const rowName = (name: string) => (name === "" ? copy.architecture.noLayer : name);
    const landing = ((): LandingView | null => {
        const { layers, domains, cells } = architecture.landing;
        if (layers.length === 0) return null;
        const lines: string[] = [];
        const rows = layers.map((row) => {
            const total = valueOf(row.number);
            return {
                name: rowName(row.name),
                total: total === undefined ? "" : String(total.value),
                cells: domains.map((domain) => {
                    const cell = cells.find((each) => each.layer === row.layer && each.domain === domain);
                    const entry = cell === undefined ? undefined : valueOf(cell.number);
                    if (entry !== undefined) lines.push(`${rowName(row.name)}, ${columnName(domain)}: ${countOf(entry).text}`);
                    return entry === undefined ? { text: "", scope: "" } : { text: entry.value.toLocaleString("en"), scope: entry.scope };
                }),
            };
        });
        return { caption: copy.architecture.landingCaption, columns: domains.map(columnName), rows, lines };
    })();
    const unplacedNumber = valueOf("architecture/unplaced");
    const ruleSays = (id: string) => (data.fact("rules", id)?.says as string | undefined) ?? "";
    const storeNames = (containers: readonly { name: string; kind: string }[], integrations: readonly { outside: string; name: string }[]) => [
        ...containers.filter((each) => each.kind === "store").map((each) => each.name),
        ...integrations.filter((each) => outside.get(each.outside)?.kind === "dataStore").map((each) => each.name),
    ];
    return {
        name: architecture.name,
        idea: architecture.idea,
        why: architecture.recommended,
        facts: [...facts, ...score],
        containers: architecture.containers.map((each) => ({
            name: each.name,
            kind: containerWords(each.kind),
            does: each.does,
            runsOn: each.runsOnWords ?? each.runsOn,
            tech: stackLineOf(each.tech).line,
            holds: each.holds,
        })),
        domainsDiagram: diagramView("organisation/target", { title: copy.architecture.domains }),
        talksDiagram: diagramView("context/target", { title: copy.architecture.parts }),
        domains: architecture.domains.map((domain) => ({
            name: domain.name,
            concept: domain.concept,
            why: domain.why,
            counts: [`architecture/domain/${domain.slug}/components`, `architecture/domain/${domain.slug}/rules`].flatMap((key) => {
                const entry = valueOf(key);
                return entry === undefined ? [] : [countOf(entry).text];
            }),
            uses: architecture.domainEdges.filter((edge) => edge.from === domain.name).map((edge) => edge.to),
            usedBy: architecture.domainEdges.filter((edge) => edge.to === domain.name).map((edge) => edge.from),
        })),
        components: architecture.components.map((each) => ({ name: each.name, domain: each.domain, does: each.responsibility })),
        stack: (brief?.changes?.stack ?? []).map((each) => ({ ...stackLineOf(each.line), carriedBy: each.layers })),
        outside: architecture.integrations.map((each) => {
            const kind = outside.get(each.outside)?.kind;
            return {
                name: each.name,
                kind: kind === undefined ? null : (copy.architecture.outsideKinds[kind] ?? null),
                owner: each.domain,
                how: each.how,
                through: architecture.components.filter((component) => component.adapts === each.outside).map((component) => component.name),
            };
        }),
        risks: architecture.risks.filter((risk) => risk.kind !== "question").map(riskOf),
        questions: architecture.risks.filter((risk) => risk.kind === "question").map(riskOf),
        landing,
        unplaced:
            unplacedNumber === undefined || architecture.unplaced.length === 0
                ? null
                : {
                      title: countOf(unplacedNumber).text,
                      scope: unplacedNumber.scope,
                      rules: architecture.unplaced.map((each) => ({ says: ruleSays(each.rule), reason: each.reason })).filter((each) => each.says !== ""),
                  },
        options: optionsOf(architecture, storeNames),
        challenges: conflicts.map((each) => ({ says: each.says, other: each.variant === architecture.name ? null : each.variant })),
        since: joined(sinceOf("architecture", (key) => key), sinceOf("components", (key) => key)),
    };
};

/** The chosen architecture first, then each option not chosen, with what each record keeps of its parts. */
const optionsOf = (
    architecture: Architecture,
    stores: (containers: readonly { name: string; kind: string }[], integrations: readonly { outside: string; name: string }[]) => string[],
): Option[] => [
    {
        name: architecture.name,
        idea: architecture.idea,
        cost: architecture.tradeoff,
        chosen: true,
        why: architecture.recommended,
        parts: architecture.containers.map((each) => each.name),
        domains: architecture.domains.map((each) => each.name),
        data: stores(architecture.containers, architecture.integrations),
    },
    ...architecture.alternatives.map((each) => ({
        name: each.name,
        idea: each.idea,
        cost: each.tradeoff,
        chosen: false,
        why: null,
        parts: each.containers.map((container) => container.name),
        domains: each.domains.map((domain) => domain.name),
        data: stores(each.containers, each.integrations),
    })),
];

export type ChoicesView = {
    gates: string[];
    asIs: { journeys: CountView | null; steps: CountView | null; since: Since | null };
    journeys: {
        rows: { title: string; way: string; strategy: string; idea: string; why: string | null; cost: string; others: { name: string; strategy: string; idea: string; cost: string }[] }[];
        strategies: CountView | null;
        since: Since | null;
    };
    architecture: { options: Option[]; since: Since | null };
    components: { components: CountView | null; domains: CountView | null; since: Since | null };
};

/** The four choices, when the case holds them. */
export const choicesView = async (): Promise<ChoicesView | null> => {
    const changed = read<Changed[]>("journeys/changed.json");
    if (changed === null || changed.length === 0) return null;
    const today = new Map((read<TodayJourney[]>("journeys/today.json") ?? []).map((each) => [each.id, each]));
    const proposed = read<ProposedJourney[]>("journeys/proposed.json") ?? [];
    const byId = new Map(proposed.map((each) => [(each as ProposedJourney & { id: string }).id, each]));
    const architecture = read<Architecture>("architecture.json");
    return {
        gates: changed.map((each) => each.gate),
        asIs: {
            journeys: await numberOf("journeys/today"),
            steps: await numberOf("journeys/today/steps"),
            since: sinceOf("as-is", (key) => today.get(key)?.title),
        },
        journeys: {
            rows: proposed.map((each) => ({
                title: today.get(each.task)?.title ?? each.name,
                way: each.name,
                strategy: each.strategy,
                idea: each.idea,
                why: each.recommended,
                cost: each.tradeoff,
                others: each.alternatives.map((other) => ({ name: other.name, strategy: other.strategy, idea: other.idea, cost: other.tradeoff })),
            })),
            strategies: await numberOf("journeys/strategies"),
            since: sinceOf("journeys", (key) => {
                const journey = byId.get(key);
                return journey === undefined ? undefined : `${today.get(journey.task)?.title ?? journey.name}: ${journey.name}`;
            }),
        },
        architecture: {
            options: architecture === null ? [] : optionsOf(architecture, () => []),
            since: sinceOf("architecture", (key) => key),
        },
        components: {
            components: await numberOf("architecture/components"),
            domains: await numberOf("architecture/domains"),
            since: sinceOf("components", (key) => key),
        },
    };
};
