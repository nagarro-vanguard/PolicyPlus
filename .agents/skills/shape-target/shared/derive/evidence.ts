import type { Architecture, StoredJourney } from "../model/records";
import { decidingDomains } from "./checks";

/**
 * What the writer of a variant cannot see in its own text and the reviewer should weigh, counted by script: per domain,
 * the rules it decides, the kinds of data it owns, whom it depends on, and the steps decided in it that touch data owned
 * elsewhere. No limit is applied; a reader decides what a lopsided figure means.
 * @param variants the variants as written
 * @param journeys the chosen journeys
 * @returns plain lines for the reviewer's context
 */
export const evidenceOf = (variants: readonly Architecture[], journeys: readonly StoredJourney[]): string[] => {
    const steps = journeys.flatMap((journey) => journey.steps);
    return variants.flatMap((variant) => {
        const total = variant.domains.reduce((sum, domain) => sum + domain.rules.length, 0);
        const owner = (id: string) =>
            variant.domains.find((domain) => domain.facts.some((fact) => fact.from.some((from) => from === id)));
        return [
            `Variant "${variant.name}": ${variant.domains.length} domains, ${total} rules placed.`,
            ...variant.domains.map((domain) => {
                const crossing = steps.filter(
                    (step) =>
                        decidingDomains(variant.domains, step).includes(domain) &&
                        step.touches.some((id) => owner(id) !== undefined && owner(id) !== domain),
                );
                const share = total === 0 ? 0 : Math.round((domain.rules.length / total) * 100);
                return `  ${domain.name}: decides ${domain.rules.length} rules (${share}% of those placed), owns ${domain.facts.length} kinds of data, depends on ${domain.dependsOn.length === 0 ? "no domain" : domain.dependsOn.join(", ")}; ${crossing.length} steps decided here touch data owned elsewhere.`;
            }),
        ];
    });
};
