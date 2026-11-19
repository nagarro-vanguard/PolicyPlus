// The journeys of this build, read through the content collections (which validate them) and joined: today's, the way proposed for
// each, where each belongs, and the evidence each cites. Made once per build.
import { getCollection } from "astro:content";
import { ruleAnchors } from "./analysis";
import { joinJourneys, placementOf } from "./journey-join";
import type { Gate, Journey } from "./journey-join";
import { capabilities, slugs, system } from "./payloads";
import { hasTarget, targetData } from "./target-data";
import { where } from "./text";
import { titleOf } from "./derive";
import { titleOfJourney } from "./journey-join";
import type { JourneyLine } from "./slice";

export type Evidence = {
    readonly text: string;
    /** Where it is read, from the site's root. */
    readonly href: string;
    readonly place: string;
    readonly capability: string;
    readonly layer?: string;
};

export type JourneyModel = {
    readonly journeys: readonly Journey[];
    readonly gate: Gate;
    readonly action: (id: string) => Evidence | undefined;
    readonly rule: (id: string) => Evidence | undefined;
    /** What the old system keeps and how it names it, when the target holds it. */
    readonly entityName: (id: string) => string | undefined;
    /** The journeys that use an action, a capability's actions or one of some rules, by the ids the analysis gave them. */
    readonly usingAction: (id: string) => readonly Journey[];
    readonly usingCapability: (id: string) => readonly Journey[];
    readonly usingRules: (ids: readonly string[]) => readonly Journey[];
};

/** A journey as a link: its page and its words. */
export type JourneyLink = { readonly text: string; readonly href: string };

/**
 * The links to journeys, from a page `depth` folders below the root.
 * @param journeys the journeys
 * @param depth how many folders deep the page is
 * @returns the links
 */
export const linksTo = (journeys: readonly Journey[], depth: number): JourneyLink[] =>
    journeys.map((journey) => ({ text: titleOfJourney(journey), href: `${"../".repeat(depth)}journey/${journey.slug}.html` }));

let cache: Promise<JourneyModel> | undefined;

/**
 * The journeys, joined.
 * @returns the model, made once per build
 */
export const journeyModel = (): Promise<JourneyModel> => {
    cache ??= (async () => {
        const [sys, caps, addresses] = await Promise.all([system(), capabilities(), slugs()]);
        const ownerOf = new Map<string, string>();
        const actions = new Map<string, Evidence>();
        const rules = new Map<string, Evidence>();
        for (const cap of caps) {
            const capSlug = addresses.capability(cap.capability.id);
            for (const layer of cap.layers) {
                const anchors = ruleAnchors(layer.rules);
                for (const action of layer.actions) {
                    ownerOf.set(action.id, cap.capability.id);
                    if (!actions.has(action.id)) actions.set(action.id, { text: titleOf(action.purpose), href: `action/${capSlug}/${addresses.action(cap.capability.id, action.id)}.html`, place: where(action.place), capability: cap.capability.name });
                }
                for (const rule of layer.rules) {
                    if (!rules.has(rule.id)) rules.set(rule.id, { text: titleOf(rule.says), href: `layer/${capSlug}/${addresses.layer(cap.capability.id, layer.id)}.html#${anchors.get(rule.id) ?? ""}`, place: where(rule.place), capability: cap.capability.name, layer: layer.name });
                }
            }
        }
        const capById = new Map(sys.capabilities.map((cap) => [cap.id, { id: cap.id, name: cap.name }] as const));
        const areaOf = new Map<string, { id: string; name: string }>();
        for (const area of sys.areas) for (const id of area.capabilities) areaOf.set(id, { id: area.id, name: area.name });
        const data = hasTarget() ? targetData() : undefined;
        const state = data?.gates.journeys.state;
        const gate: Gate = state === "confirmed" ? "confirmed" : state === "waiting" ? "waiting" : "other";
        const [today, chosen, considered] = await Promise.all([getCollection("journeys"), getCollection("ways"), getCollection("considered")]);
        const journeys = joinJourneys({ today: today.map((each) => each.data), chosen: chosen.map((each) => each.data), considered: considered.map((each) => each.data), gate, placement: placementOf(ownerOf, capById, areaOf) });
        const entities = data?.legacy?.entities;
        return {
            journeys,
            gate,
            action: (id) => actions.get(id),
            rule: (id) => rules.get(id),
            entityName: (id) => entities?.[id]?.name,
            usingAction: (id) => journeys.filter((journey) => journey.today.actions.includes(id)),
            usingCapability: (id) => journeys.filter((journey) => journey.today.actions.some((action) => ownerOf.get(action) === id)),
            usingRules: (ids) => journeys.filter((journey) => journey.today.rules.some((rule) => ids.includes(rule))),
        };
    })();
    return cache;
};

/**
 * The journeys as the index and the palette hold them.
 * @returns one line per journey
 */
export const journeyLines = async (): Promise<JourneyLine[]> =>
    (await journeyModel()).journeys.map((journey) => ({ slug: journey.slug, title: titleOfJourney(journey), summary: titleOf(journey.today.outcome), status: journey.status, area: journey.area?.name }));
