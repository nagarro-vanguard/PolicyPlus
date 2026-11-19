// Today's journeys joined to the ways proposed for them, and the rows the journey page lays side by side. Pure functions of the
// records, so a test can run them without a build. Nothing is invented: a row exists because a record links two steps.
import { headlineOf, ledeOf } from "./derive";
import { slugify } from "./slugs";
import type { TodayRecord, WayRecord } from "./journey-schema";

export type Gate = "waiting" | "confirmed" | "other";
/** Where a journey stands: only today's is known, a way is proposed, or a way is decided. */
export type JourneyStatus = "today only" | "proposed" | "decided";

export type Journey = {
    readonly id: string;
    /** The address part of its page: `journey/<slug>.html`. */
    readonly slug: string;
    readonly today: TodayRecord;
    /** The way shown beside today: the one chosen or, until one is, the one recommended. Absent when none is proposed. */
    readonly way: WayRecord | undefined;
    /** The other ways that were considered. */
    readonly others: readonly WayRecord[];
    readonly status: JourneyStatus;
    readonly area: { readonly id: string; readonly name: string } | undefined;
    readonly capability: { readonly id: string; readonly name: string } | undefined;
};

export type Placement = {
    readonly area: (task: TodayRecord) => Journey["area"];
    readonly capability: (task: TodayRecord) => Journey["capability"];
};

/**
 * One address part per journey: the id's readable form, with a number after it when two share it, in the order of the ids so
 * a rebuild gives the same addresses.
 * @param ids the journey ids
 * @returns the address part by id
 */
export const journeySlugs = (ids: readonly string[]): ReadonlyMap<string, string> => {
    const taken = new Map<string, number>();
    const slugs = new Map<string, string>();
    for (const id of [...ids].sort()) {
        const base = slugify(id);
        const seen = taken.get(base) ?? 0;
        taken.set(base, seen + 1);
        slugs.set(id, seen === 0 ? base : `${base}-${seen + 1}`);
    }
    return slugs;
};

/**
 * Today's journeys with the way proposed for each. The way is the chosen one; a journey with none chosen shows the recommended
 * way, and is only "proposed" until the decision on journeys is confirmed.
 * @param input the records
 * @param input.today today's journeys
 * @param input.chosen the ways chosen, one per journey
 * @param input.considered every way considered, the chosen ones included
 * @param input.gate where the decision on journeys stands
 * @param input.placement the area and capability of a journey
 * @returns one journey per record of today, in the order given
 */
export const joinJourneys = (input: {
    readonly today: readonly TodayRecord[];
    readonly chosen: readonly WayRecord[];
    readonly considered: readonly WayRecord[];
    readonly gate: Gate;
    readonly placement: Placement;
}): Journey[] => {
    const slugs = journeySlugs(input.today.map((task) => task.id));
    return input.today.map((task) => {
        const chosen = input.chosen.find((way) => way.task === task.id);
        const options = input.considered.filter((way) => way.task === task.id);
        const recommended = options.find((way) => way.recommended !== undefined);
        const way = chosen ?? recommended;
        const others = options.filter((each) => each.id !== way?.id && each.name !== way?.name);
        const status: JourneyStatus = way === undefined ? "today only" : chosen !== undefined && input.gate === "confirmed" ? "decided" : "proposed";
        return { id: task.id, slug: slugs.get(task.id) ?? slugify(task.id), today: task, way, others, status, area: input.placement.area(task), capability: input.placement.capability(task) };
    });
};

/** The page's title: at most eight words, from the outcome. */
export const titleOfJourney = (journey: Journey) => headlineOf(journey.today.outcome).replace(/…$/, "");
/** The lede: the outcome in full (the whole sentence, or its leading sentences). Empty when the title already says it all. */
export const ledeOfJourney = (journey: Journey) => {
    const lede = ledeOf(journey.today.outcome);
    return lede.replace(/[.]$/, "") === titleOfJourney(journey) ? "" : lede;
};

/** One row of the two columns: the steps of today and the steps of the way that stand for one another. */
export type Row = {
    readonly today: readonly { readonly at: number; readonly step: TodayRecord["current"][number] }[];
    readonly modern: readonly { readonly at: number; readonly step: WayRecord["steps"][number] }[];
};

/**
 * The rows of the two columns. A step of the way is tied to the steps of today whose code it comes from (`link.from` shares an
 * id with a step's `from`); steps tied through any chain share a row, so a merge puts the steps it replaces beside it. Rows
 * follow today's order; a step with no link (a new one) follows the row of the step before it; a step of today that nothing
 * replaces stands alone.
 * @param today today's steps
 * @param way the way, or none
 * @returns the rows
 */
export const alignRows = (today: TodayRecord["current"], way: WayRecord | undefined): Row[] => {
    const steps = way?.steps ?? [];
    // Union the steps of both sides that share a source id.
    const parent = new Map<string, string>();
    const find = (key: string): string => {
        const up = parent.get(key) ?? key;
        if (up === key) return key;
        const root = find(up);
        parent.set(key, root);
        return root;
    };
    const join = (one: string, other: string) => parent.set(find(one), find(other));
    today.forEach((_, at) => parent.set(`t${at}`, `t${at}`));
    steps.forEach((_, at) => parent.set(`m${at}`, `m${at}`));
    const owners = new Map<string, string[]>();
    today.forEach((step, at) => {
        for (const id of step.from) owners.set(id, [...(owners.get(id) ?? []), `t${at}`]);
    });
    steps.forEach((step, at) => {
        if (step.link._tag !== "legacy") return;
        for (const id of step.link.from) for (const key of owners.get(id) ?? []) join(key, `m${at}`);
    });
    const groups = new Map<string, { t: number[]; m: number[] }>();
    const slot = (key: string) => {
        const found = groups.get(key) ?? { t: [], m: [] };
        groups.set(key, found);
        return found;
    };
    today.forEach((_, at) => slot(find(`t${at}`)).t.push(at));
    steps.forEach((_, at) => slot(find(`m${at}`)).m.push(at));
    const rows = [...groups.values()].map((group) => ({ t: group.t, m: group.m }));
    // Order: by the first step of today; rows without one follow the row of the previous modern step.
    const withToday = rows.filter((row) => row.t.length > 0).sort((a, b) => (a.t[0] ?? 0) - (b.t[0] ?? 0));
    const ordered = [...withToday];
    for (const row of rows.filter((each) => each.t.length === 0).sort((a, b) => (a.m[0] ?? 0) - (b.m[0] ?? 0))) {
        const before = (row.m[0] ?? 0) - 1;
        const after = before < 0 ? -1 : ordered.findIndex((each) => each.m.includes(before));
        ordered.splice(after + 1, 0, row);
    }
    return ordered.map((row) => ({
        today: row.t.map((at) => ({ at, step: today[at] as TodayRecord["current"][number] })),
        modern: row.m.map((at) => ({ at, step: steps[at] as WayRecord["steps"][number] })),
    }));
};

/** The numbers on the meta line. */
export const measures = (journey: Journey) => {
    const way = journey.way;
    const kept = new Set((way?.steps ?? []).flatMap((step) => (step.link._tag === "legacy" ? step.link.keeps : [])));
    const droppedRules = new Set((way?.drops ?? []).flatMap((drop) => drop.rules));
    return {
        stepsToday: journey.today.current.length,
        stepsProposed: way?.steps.length,
        rulesKept: kept.size,
        rulesDropped: droppedRules.size,
        actionsDropped: new Set((way?.drops ?? []).flatMap((drop) => drop.actions)).size,
    };
};

/** Areas in the order they first appear, each with its journeys. A journey with no area goes last. */
export const groupByArea = (journeys: readonly Journey[]) => {
    const groups = new Map<string, { id: string; name: string; journeys: Journey[] }>();
    for (const journey of journeys) {
        const key = journey.area?.id ?? "";
        const group = groups.get(key) ?? { id: key, name: journey.area?.name ?? "Other journeys", journeys: [] };
        group.journeys.push(journey);
        groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => (a.id === "" ? 1 : 0) - (b.id === "" ? 1 : 0));
};

/** The ids of the steps of the way, for the components that serve them. */
export const stepIds = (journey: Journey) => (journey.way?.steps ?? []).map((step) => step.id);

/**
 * The area and the capability of a journey: the capability that holds most of its actions, and that capability's area.
 * @param task the journey
 * @param ownerOf the capability id of an action
 * @param capabilities the capabilities by id
 * @param areaOf the area of a capability, by id
 * @returns the area and the capability, either of which may be absent
 */
export const placementOf = (
    ownerOf: ReadonlyMap<string, string>,
    capabilities: ReadonlyMap<string, { id: string; name: string }>,
    areaOf: ReadonlyMap<string, { id: string; name: string }>,
): Placement => {
    const capability = (task: TodayRecord) => {
        const counts = new Map<string, number>();
        for (const id of task.actions) {
            const owner = ownerOf.get(id);
            if (owner !== undefined) counts.set(owner, (counts.get(owner) ?? 0) + 1);
        }
        const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        return best === undefined ? undefined : capabilities.get(best);
    };
    return { capability, area: (task) => { const cap = capability(task); return cap === undefined ? undefined : areaOf.get(cap.id); } };
};
