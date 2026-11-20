import { copy } from "../lib/copy";
import { caseData } from "./data";
import { type DiagramView, viewOf, viewsOfSection } from "./diagram-view";
import { type CountView, countOf } from "./format";
import { theCase } from "./loader";

// What the Architecture and Choices pages show, read from the case: its views of today, of the chosen architecture and
// of each option, the data of today, the request's stack lines, the open challenges and what changed since the person
// confirmed. A page asks the case for the views of a section and draws whatever it finds; the
// view follows the keys the case gives (an outside system's id, a journey's task, a domain's name) and never counts:
// every number is a key of numbers.json.

type Architecture = {
    confirmed: boolean;
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string | null;
    domains: { name: string; slug: string; concept: string; dependsOn: string[] }[];
    risks: string[];
    alternatives: { name: string; idea: string; tradeoff: string; risks: string[] }[];
    landing: {
        layers: { layer: string | null; name: string; number: string }[];
        domains: string[];
        cells: { layer: string | null; domain: string; number: string }[];
    };
    unplaced: { rule: string; reason: string | null }[];
};
type Changed = { gate: string; state: string; since: { added: string[]; removed: string[]; changed: string[]; names?: Record<string, string> } | null };
type Conflict = { stage: string; variant: string; says: string; resolved: boolean | null };
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

export type Option = {
    name: string;
    idea: string;
    cost: string;
    chosen: boolean;
    why: string | null;
};

export type LandingView = {
    caption: string;
    columns: string[];
    rows: { name: string; total: string; cells: { text: string; scope: string }[] }[];
    lines: string[];
};

export type TodayView = {
    views: DiagramView[];
    entities: { name: string; line: string }[];
};

export type ProposedView = {
    /** Whether the person confirmed it with its components; otherwise it is the recommended option, proposed. */
    confirmed: boolean;
    name: string;
    idea: string;
    why: string | null;
    facts: CountView[];
    /** The views of the chosen architecture, in the case's order. */
    views: DiagramView[];
    risks: string[];
    /** Each option not chosen: what it is, what it costs, what it risks and its own views. */
    variants: { name: string; idea: string; cost: string; risks: string[]; views: DiagramView[] }[];
    domains: { name: string; concept: string; uses: string[]; usedBy: string[]; counts: string[] }[];
    landing: LandingView | null;
    unplaced: { title: string; scope: string; rules: { says: string; reason: string | null }[] } | null;
    challenges: { says: string; other: string | null }[];
    since: Since | null;
};

/** Today: the views of the case for it, and the kinds of data it keeps. */
export const todayView = (): TodayView => ({
    views: viewsOfSection("today").map(viewOf),
    entities: (read<Entity[]>("facts/entities.json") ?? []).map((each) => ({ name: each.name, line: each.purpose })),
});

/** The proposal, when the case holds an architecture. */
export const proposedView = async (): Promise<ProposedView | null> => {
    const architecture = read<Architecture>("architecture.json");
    if (architecture === null) return null;
    const facts = (await Promise.all(["architecture/domains", "architecture/containers", "architecture/components"].map(numberOf))).filter(
        (each): each is CountView => each !== null,
    );
    // A challenge about an option the person did not choose says nothing about the design they did.
    const conflicts = (read<Conflict[]>("plan/conflicts.json") ?? []).filter(
        (each) => each.stage === "architecture" && each.resolved !== true && each.variant === architecture.name,
    );
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
    return {
        confirmed: architecture.confirmed,
        name: architecture.name,
        idea: architecture.idea,
        why: architecture.recommended,
        facts: [...facts, ...score],
        views: viewsOfSection("target").map(viewOf),
        risks: architecture.risks,
        variants: architecture.alternatives.map((each) => ({
            name: each.name,
            idea: each.idea,
            cost: each.tradeoff,
            risks: each.risks,
            views: viewsOfSection(`variant.${each.name}`).map(viewOf),
        })),
        domains: architecture.domains.map((domain) => ({
            name: domain.name,
            concept: domain.concept,
            counts: [`architecture/domain/${domain.slug}/components`, `architecture/domain/${domain.slug}/rules`].flatMap((key) => {
                const entry = valueOf(key);
                return entry === undefined ? [] : [countOf(entry).text];
            }),
            uses: domain.dependsOn,
            usedBy: architecture.domains.filter((other) => other.dependsOn.includes(domain.name)).map((other) => other.name),
        })),
        landing,
        unplaced:
            unplacedNumber === undefined || architecture.unplaced.length === 0
                ? null
                : {
                      title: countOf(unplacedNumber).text,
                      scope: unplacedNumber.scope,
                      rules: architecture.unplaced.map((each) => ({ says: ruleSays(each.rule), reason: each.reason })).filter((each) => each.says !== ""),
                  },
        challenges: conflicts.map((each) => ({ says: each.says, other: each.variant === architecture.name ? null : each.variant })),
        since: joined(sinceOf("architecture", (key) => key), sinceOf("components", (key) => key)),
    };
};

/** The chosen architecture first, then each option not chosen, with what each record keeps of its parts. */
const optionsOf = (architecture: Architecture): Option[] => [
    {
        name: architecture.name,
        idea: architecture.idea,
        cost: architecture.tradeoff,
        chosen: true,
        why: architecture.recommended,
    },
    ...architecture.alternatives.map((each) => ({
        name: each.name,
        idea: each.idea,
        cost: each.tradeoff,
        chosen: false,
        why: null,
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
            options: architecture === null ? [] : optionsOf(architecture),
            since: sinceOf("architecture", (key) => key),
        },
        components: {
            components: await numberOf("architecture/components"),
            domains: await numberOf("architecture/domains"),
            since: sinceOf("components", (key) => key),
        },
    };
};
