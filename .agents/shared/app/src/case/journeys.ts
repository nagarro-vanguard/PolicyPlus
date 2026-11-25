import { type ChangeGroup, changeGroupOf, changeWords, copy } from "../lib/copy";
import { countOf, type CountView } from "./format";
import { theCase } from "./loader";
import { addressOf } from "./routes";
import type { Section } from "./sections";
import type { CaseData, Link, NodeRecord } from "./view";

// What the Journeys section shows, read from the case's `journeys/` files and followed by key into the facts, the
// nodes, the architecture and the plan. Nothing is counted, joined or inferred here: a journey's area and capability
// are the hierarchy's own grouping (the overview's areas, each area's capabilities, in the case's order); the rows
// that put a step of today beside a step of the new way are the pairs the case gives each chosen journey; a step's
// rules, domains and stories are its trace record. Every count shown is a key of numbers.json.

type Today = { id: string; slug: string; actor: string; title: string; capability: string | null; outcome: string; steps: TodayStep[] };
type TodayStep = { number: number; intent: string; system: string; from: string[] };
type Proposed = {
    id: string;
    task: string;
    slug: string;
    actor: string;
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string | null;
    steps: ProposedStep[];
    pairs: { today: number; proposed: number }[];
    hasChanges: boolean;
    alternatives: { name: string; idea: string; tradeoff: string }[];
};
type ProposedStep = {
    id: string;
    number: number;
    intent: string;
    system: string;
    change: string;
    reason: string;
    from: string[];
    touches: string[];
    changes: { rule: string; to: string }[];
};
type Trace = { journey: string; step: string; stories: string[]; domains: string[]; kept: string[]; changed: { rule: string; to: string }[]; dropped: string[] };
type Dropped = { journey: string; actions: string[]; rules: string[]; reason: string };
type Conflict = { stage: string; variant: string; says: string; resolved: boolean | null };

export type MaybeLink = { name: string; href?: string; line?: string };

export type DropView = { journey: MaybeLink; area: string; reason: string; actions: MaybeLink[]; rules: MaybeLink[] };

export type ListRow = {
    slug: string;
    href: string;
    title: string;
    outcome: string;
    area: string;
    groups: ChangeGroup[];
    hasWay: boolean;
    hasChanges: boolean;
    hasDropped: boolean;
    /** The journey's numbers in words: its steps today and in the new way, then its business rules. */
    counts: string | null;
};

export type ListGroup = {
    area: { slug: string; name: string } | null;
    capabilities: { name: string; href?: string; rows: ListRow[] }[];
};

export type StepView = {
    number: number;
    intent: string;
    system: string;
    change: { group: Exclude<ChangeGroup, "dropped">; label: string };
    reason: string;
    places: MaybeLink[];
    domains: MaybeLink[];
    kept: MaybeLink[];
    changed: { rule: MaybeLink; to: string }[];
    dropped: MaybeLink[];
    stories: MaybeLink[];
    data: string[];
    /** The fold titles of its kept and left-out rules, each the number in words, from numbers.json. */
    keptTitle: string | null;
    droppedTitle: string | null;
};

export type TodayStepView = { number: number; intent: string; system: string };

export type PairRow = { today: TodayStepView[]; proposed: StepView[] };

export type JourneyView = {
    slug: string;
    page: string;
    title: string;
    outcome: string;
    capability: MaybeLink | null;
    groups: ChangeGroup[];
    counts: string | null;
    way: { name: string; idea: string; recommended: string | null; tradeoff: string } | null;
    alternatives: { name: string; idea: string; tradeoff: string }[];
    rows: PairRow[];
    drops: DropView[];
    challenges: string[];
    prev: Link | null;
    next: Link | null;
    context: { file: string; kilobytes: number } | null;
};

export type JourneysView = {
    hasWays: boolean;
    facts: CountView[];
    groups: ListGroup[];
    areas: { slug: string; name: string }[];
    drops: DropView[];
    journeys: JourneyView[];
    /** Who takes part: each role the journeys name, with the journeys it does. */
    actors: { name: string; journeys: { title: string; page: string }[] }[];
};

/** The page of a journey, below the site's root. */
export const journeyPageOf = (slug: string) => `journey/${slug}.html`;

/** The context text of a journey, below the site's root. */
export const journeyContextFileOf = (slug: string) => `context/journey/${slug}.txt`;

const read = <T>(path: string, fallback: T): T => {
    const kase = theCase();
    return kase.has(path) ? (kase.json(path) as T) : fallback;
};

const groupOf = (change: string): Exclude<ChangeGroup, "dropped"> => {
    const group = changeGroupOf[change];
    if (group === undefined || changeWords[change] === undefined)
        throw new Error(`a step of a new journey carries the change word "${change}", which the app has no plain words for (src/lib/copy.ts)`);
    return group;
};

/** The order the kinds of change are said in. */
const groupOrder: readonly ChangeGroup[] = ["kept", "merged", "reworked", "new", "dropped"];

/**
 * The rows of a journey: each step of today beside the steps of the new way that do its work, from the `replacedBy`
 * pairs the case gives. Steps a pair links share a row; a step of today no edge reaches has a row of
 * its own after the row that holds the step before it.
 */
const rowsOf = (today: readonly TodayStepView[], proposed: readonly StepView[], edges: readonly { from: string; to: string }[]): PairRow[] => {
    const owner = new Map<string, string>();
    const find = (id: string): string => {
        const up = owner.get(id) ?? id;
        if (up === id) return id;
        const top = find(up);
        owner.set(id, top);
        return top;
    };
    for (const edge of edges) {
        const one = find(edge.from);
        const other = find(edge.to);
        if (one !== other) owner.set(one, other);
    }
    const rows = new Map<string, PairRow>();
    const rowOf = (id: string) => {
        const top = find(id);
        let row = rows.get(top);
        if (row === undefined) {
            row = { today: [], proposed: [] };
            rows.set(top, row);
        }
        return row;
    };
    for (const step of proposed) rowOf(`proposed-${step.number}`).proposed.push(step);
    for (const step of today) rowOf(`today-${step.number}`).today.push(step);
    const withWay = [...rows.values()].filter((row) => row.proposed.length > 0);
    const ordered = withWay.sort((one, other) => (one.proposed[0]?.number ?? 0) - (other.proposed[0]?.number ?? 0));
    for (const row of rows.values()) {
        if (row.proposed.length > 0) continue;
        const first = row.today[0]?.number ?? 0;
        let at = -1;
        ordered.forEach((each, index) => {
            if (each.today.some((step) => step.number < first)) at = index;
        });
        ordered.splice(at + 1, 0, row);
    }
    return ordered;
};

/**
 * The Journeys section, read once per build.
 * @param data the case's records by key
 * @param nodes every node of the case
 * @param sections the sections a reader can open, for links into them
 * @returns the list, the drops and every journey's page
 */
export const journeysOf = (data: CaseData, nodes: readonly NodeRecord[], sections: readonly Section[]): JourneysView => {
    const today = read<Today[]>("journeys/today.json", []);
    const proposed = read<Proposed[]>("journeys/proposed.json", []);
    const traces = read<Trace[]>("journeys/trace.json", []);
    const dropped = read<Dropped[]>("journeys/dropped.json", []);
    const conflicts = read<Conflict[]>("plan/conflicts.json", []);
    const stories = read<{ key: string; title: string; sequence: number }[]>("plan/stories.json", []);
    const architecture = read<{ domains: { name: string }[] } | null>("architecture.json", null);
    const contextIndex = read<Record<string, Record<string, number>>>("context/index.json", {});
    const hasWays = proposed.length > 0;
    const built = (id: string) => sections.some((section) => section.id === id && section.built);

    const levelOf = (key: string) => data.node(key)?.level;
    const byRef = new Map<string, NodeRecord>();
    for (const node of nodes) if (node.ref !== null) byRef.set(`${node.ref.collection}:${node.ref.id}`, node);
    const nodeLink = (collection: string, id: string, name?: string): MaybeLink => {
        const node = byRef.get(`${collection}:${id}`);
        if (node === undefined) return { name: name ?? "" };
        return { name: name ?? node.name, href: addressOf(node, levelOf) };
    };
    const ruleLink = (id: string) => nodeLink("rules", id);
    const actionLink = (id: string): MaybeLink => {
        const node = byRef.get(`actions:${id}`);
        if (node === undefined) return { name: "" };
        return { name: node.summary === "" ? node.name : node.summary, href: addressOf(node, levelOf) };
    };
    const placesOf = (actions: readonly string[]): MaybeLink[] => {
        const seen = new Set<string>();
        const places: MaybeLink[] = [];
        for (const id of actions) {
            const action = byRef.get(`actions:${id}`);
            const key = action?.crumbs.find((crumb) => levelOf(crumb) === "surface");
            const place = key === undefined ? undefined : data.node(key);
            if (place === undefined || seen.has(place.key)) continue;
            seen.add(place.key);
            places.push({ name: place.name, href: addressOf(place, levelOf) });
        }
        return places;
    };
    // The Architecture page shows the chosen domains in its `proposed` part, with no address per domain yet.
    const domainNames = new Set((architecture?.domains ?? []).map((domain) => domain.name));
    const domainLink = (name: string): MaybeLink =>
        built("architecture") && domainNames.has(name) ? { name, href: "architecture.html#proposed" } : { name };
    // The Plan page opens a story at `#story=<its place in the plan's order>`, the story's own `sequence`.
    const storyOf = new Map(stories.map((story) => [story.key, story]));
    const storyLink = (key: string): MaybeLink[] => {
        const story = storyOf.get(key);
        if (story === undefined) return [];
        return [built("plan") ? { name: story.title, href: `plan.html#story=${story.sequence}` } : { name: story.title }];
    };
    const entityName = (id: string) => (data.fact("entities", id)?.name as string | undefined) ?? "";
    const traceOf = new Map(traces.map((trace) => [trace.step, trace]));
    const wayOf = new Map(proposed.map((way) => [way.task, way]));
    const dropsOf = new Map<string, Dropped[]>();
    for (const drop of dropped) dropsOf.set(drop.journey, [...(dropsOf.get(drop.journey) ?? []), drop]);

    // The hierarchy's own grouping: the overview's areas in order, each area's capabilities in order.
    const capabilityNode = new Map<string, NodeRecord>();
    const areaOfCapability = new Map<string, { slug: string; name: string }>();
    const areas: { slug: string; name: string; capabilities: NodeRecord[] }[] = [];
    for (const row of data.node("overview")?.children.rows ?? []) {
        const area = row.node === undefined ? undefined : data.node(row.node);
        if (area === undefined || area.level !== "area") continue;
        const entry = { slug: area.key.slice("area/".length), name: area.name, capabilities: [] as NodeRecord[] };
        for (const child of area.children.rows) {
            const capability = child.node === undefined ? undefined : data.node(child.node);
            if (capability === undefined || capability.level !== "capability" || capability.ref === null) continue;
            entry.capabilities.push(capability);
            capabilityNode.set(capability.ref.id, capability);
            areaOfCapability.set(capability.ref.id, { slug: entry.slug, name: entry.name });
        }
        areas.push(entry);
    }
    const other = { slug: "other", name: "" };
    const areaSlugOf = (journey: Today) => (journey.capability === null ? undefined : areaOfCapability.get(journey.capability))?.slug ?? other.slug;

    const dropView = (drop: Dropped, journey: Today): DropView => ({
        journey: { name: journey.title, href: journeyPageOf(journey.slug) },
        area: areaSlugOf(journey),
        reason: drop.reason,
        actions: drop.actions.map(actionLink).filter((each) => each.name !== ""),
        rules: drop.rules.map(ruleLink),
    });

    // A number of the case in words, or nothing when the case does not hold it; zero is said only where asked.
    const said = (key: string, zero = false) => {
        const entry = data.number(key);
        return entry === undefined || (!zero && entry.value === 0) ? null : countOf(entry).text;
    };
    const countsOf = (slug: string, way: Proposed | undefined) => {
        const base = `journey/${slug}`;
        const steps = [said(`${base}/steps/today`, true), way === undefined ? null : said(`${base}/steps/proposed`, true)].filter(
            (each): each is string => each !== null,
        );
        const rules =
            way === undefined
                ? []
                : [said(`${base}/rules/kept`, true), said(`${base}/rules/changed`), said(`${base}/rules/dropped`)].filter((each): each is string => each !== null);
        if (steps.length === 0) return null;
        return rules.length === 0 ? `${steps.join(", ")}.` : `${steps.join(", ")}; ${rules.join(", ")}.`;
    };
    const stepView = (step: ProposedStep, slug: string): StepView => {
        const trace = traceOf.get(step.id);
        const changed = trace?.changed ?? step.changes;
        return {
            number: step.number,
            intent: step.intent,
            system: step.system,
            change: { group: groupOf(step.change), label: changeWords[step.change] ?? "" },
            reason: step.reason,
            places: placesOf(step.from),
            domains: (trace?.domains ?? []).map(domainLink),
            kept: (trace?.kept ?? []).map(ruleLink),
            changed: changed.map((change) => ({ rule: ruleLink(change.rule), to: change.to })),
            dropped: (trace?.dropped ?? []).map(ruleLink),
            stories: (trace?.stories ?? []).flatMap(storyLink),
            data: step.touches.map(entityName).filter((name) => name !== ""),
            keptTitle: said(`journey/${slug}/step/${step.number}/rules/kept`),
            droppedTitle: said(`journey/${slug}/step/${step.number}/rules/dropped`),
        };
    };

    const ordered: Today[] = [];
    const groups: ListGroup[] = [];
    const rowFor = (journey: Today): ListRow => {
        const way = wayOf.get(journey.id);
        const drops = way === undefined ? [] : (dropsOf.get(way.id) ?? []);
        const present = new Set<ChangeGroup>((way?.steps ?? []).map((step) => groupOf(step.change)));
        if (drops.length > 0) present.add("dropped");
        const groupsShown = groupOrder.filter((group) => present.has(group));
        return {
            slug: journey.slug,
            href: journeyPageOf(journey.slug),
            title: journey.title,
            outcome: journey.outcome,
            area: areaSlugOf(journey),
            groups: groupsShown,
            hasWay: way !== undefined,
            hasChanges: way?.hasChanges ?? false,
            hasDropped: drops.length > 0,
            counts: countsOf(journey.slug, way),
        };
    };
    const placed = new Set<string>();
    for (const area of areas) {
        const group: ListGroup = { area: { slug: area.slug, name: area.name }, capabilities: [] };
        for (const capability of area.capabilities) {
            const journeys = today.filter((journey) => journey.capability === capability.ref?.id);
            if (journeys.length === 0) continue;
            journeys.forEach((journey) => placed.add(journey.id));
            ordered.push(...journeys);
            group.capabilities.push({ name: capability.name, href: addressOf(capability, levelOf), rows: journeys.map(rowFor) });
        }
        if (group.capabilities.length > 0) groups.push(group);
    }
    const rest = today.filter((journey) => !placed.has(journey.id));
    if (rest.length > 0) {
        ordered.push(...rest);
        groups.push({ area: null, capabilities: [{ name: "", rows: rest.map(rowFor) }] });
    }

    const journeys = ordered.map((journey, index): JourneyView => {
        const way = wayOf.get(journey.id);
        const capability = journey.capability === null ? undefined : capabilityNode.get(journey.capability);
        const todaySteps = journey.steps.map((step) => ({ number: step.number, intent: step.intent, system: step.system }));
        const steps = (way?.steps ?? []).map((step) => stepView(step, journey.slug));
        const edges = (way?.pairs ?? []).map((pair) => ({ from: `today-${pair.today}`, to: `proposed-${pair.proposed}` }));
        const prev = ordered[index - 1];
        const next = ordered[index + 1];
        const bytes = contextIndex.journey?.[journey.slug];
        return {
            slug: journey.slug,
            page: journeyPageOf(journey.slug),
            title: journey.title,
            outcome: journey.outcome,
            capability: capability === undefined ? null : { name: capability.name, href: addressOf(capability, levelOf) },
            groups: rowFor(journey).groups,
            counts: countsOf(journey.slug, way),
            way: way === undefined ? null : { name: way.name, idea: way.idea, recommended: way.recommended, tradeoff: way.tradeoff },
            alternatives: way?.alternatives ?? [],
            rows: way === undefined ? todaySteps.map((step) => ({ today: [step], proposed: [] })) : rowsOf(todaySteps, steps, edges),
            drops: way === undefined ? [] : (dropsOf.get(way.id) ?? []).map((drop) => dropView(drop, journey)),
            challenges:
                way === undefined
                    ? []
                    : conflicts
                          .filter((each) => each.stage === "journeys" && each.variant === way.id && each.resolved !== true)
                          .map((each) => each.says),
            prev: prev === undefined ? null : { name: prev.title, href: journeyPageOf(prev.slug) },
            next: next === undefined ? null : { name: next.title, href: journeyPageOf(next.slug) },
            context: bytes === undefined ? null : { file: journeyContextFileOf(journey.slug), kilobytes: Math.max(1, Math.round(bytes / 1024)) },
        };
    });

    const byTask = new Map(today.map((journey) => [journey.id, journey]));
    const taskOfWay = new Map(proposed.map((way) => [way.id, way.task]));
    const drops = ordered.flatMap((journey) => {
        const way = wayOf.get(journey.id);
        return way === undefined ? [] : (dropsOf.get(way.id) ?? []).map((drop) => dropView(drop, journey));
    });
    // A drop whose way the case cannot follow to a journey of today is still listed, never lost.
    for (const drop of dropped) {
        const task = taskOfWay.get(drop.journey);
        if (task !== undefined && byTask.has(task)) continue;
        drops.push({ journey: { name: "" }, area: other.slug, reason: drop.reason, actions: drop.actions.map(actionLink).filter((each) => each.name !== ""), rules: drop.rules.map(ruleLink) });
    }

    const facts = ["journeys/today", "journeys/today/steps", ...(hasWays ? ["journeys/proposed/steps", "journeys/dropped/rules", "journeys/dropped/actions"] : [])]
        .flatMap((key) => {
            const entry = data.number(key);
            if (entry === undefined) return [];
            const shown = countOf(entry);
            const after = copy.journeys.factWords[key];
            return [after === undefined ? shown : { ...shown, text: `${shown.text} ${after}` }];
        });

    return {
        hasWays,
        facts,
        groups,
        areas: groups.flatMap((group) => (group.area === null ? [] : [group.area])),
        drops,
        journeys,
        actors: (() => {
            const actorOf = new Map([...today.map((each) => [each.slug, each.actor] as const), ...proposed.map((each) => [each.slug, each.actor] as const)]);
            const byActor = new Map<string, { title: string; page: string }[]>();
            for (const journey of journeys) {
                const name = actorOf.get(journey.slug) ?? "";
                if (name !== "") byActor.set(name, [...(byActor.get(name) ?? []), { title: journey.title, page: journey.page }]);
            }
            return [...byActor.entries()].map(([name, list]) => ({ name, journeys: list }));
        })(),
    };
};

/** The page of the list of journeys, below the site's root. */
export const journeysPage = "journeys.html";

let cached: Promise<JourneysView> | undefined;

/**
 * The Journeys section of this build, read once.
 * @returns the view
 */
export const journeysView = (): Promise<JourneysView> => {
    cached ??= (async () => {
        const { caseData, caseNodes } = await import("./data");
        const { siteOf } = await import("./site");
        return journeysOf(await caseData(), await caseNodes(), (await siteOf()).sections);
    })();
    return cached;
};
