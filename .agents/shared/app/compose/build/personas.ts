import { existsSync, readFileSync } from "node:fs";
import type { Facts } from "./facts";
import type { ProposedJourney } from "./journeys";
import { slugify } from "./text";

/*
 * The persona registry as the case holds it: each kind of person the code treats differently, with what they do, and the
 * chosen journeys that rest on a rule the persona's evidence lies in. A role check is usually the rule's own lines, so
 * a journey that keeps the rule involves the persona; a persona whose evidence lies in no rule's lines belongs to no
 * journey and is listed with none. The registry itself is the analysis's file; nothing is added to it here.
 */

type Place = { file: string; firstLine: number; lastLine: number };
type Entry = { name: string; means: string; evidence: Place[] };

export type PersonaView = {
    name: string;
    /** The key of the persona's text, below `context/persona/`. */
    key: string;
    means: string;
    journeys: { slug: string; title: string }[];
};

const overlaps = (one: Place, other: Place) =>
    one.file === other.file && one.firstLine <= other.lastLine && other.firstLine <= one.lastLine;

/**
 * The personas of the registry with the journeys each one is in.
 * @param file the registry file, when the analysis wrote one
 * @param facts the facts, for the place of each rule
 * @param journeys the chosen journeys
 * @returns the personas, in the registry's order
 */
export const personasOf = (file: string, facts: Facts, journeys: readonly ProposedJourney[]): PersonaView[] => {
    if (!existsSync(file)) return [];
    const entries = (JSON.parse(readFileSync(file, "utf8")) as { personas: Entry[] }).personas;
    const placeOf = new Map(facts.rules.map((rule) => [rule.id, rule.place as Place]));
    return entries.map((entry) => ({
        name: entry.name,
        key: slugify(entry.name),
        means: entry.means,
        journeys: journeys
            .filter((journey) =>
                journey.steps.some((step) =>
                    [...step.kept, ...step.changes.map((change) => change.rule)].some((rule) => {
                        const place = placeOf.get(rule);
                        return place !== undefined && entry.evidence.some((evidence) => overlaps(evidence, place));
                    }),
                ),
            )
            .map((journey) => ({ slug: journey.slug, title: journey.name })),
    }));
};
