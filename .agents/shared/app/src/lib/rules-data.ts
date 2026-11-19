// Every business rule once, for the rules reference: its sentence, the place that decides it, the layer and capability it is
// read in, and the page where its full sentence is written. A rule that several capabilities pass is listed under the first.
import { ruleAnchors } from "./analysis";
import { titleOf } from "./derive";
import type { Slugs } from "./slugs";
import { where } from "./text";
import type { Capability } from "./types";

export type RuleLine = {
    /** The sentence: the whole rule when short, otherwise its first sentence. */
    readonly t: string;
    readonly p: string;
    /** The layer's name. */
    readonly l: string;
    /** The capability's name. */
    readonly c: string;
    /** The page and anchor where the rule is written, from the site's root. */
    readonly h: string;
    /** Whether the rule decides whether something is refused. */
    readonly g: boolean;
};

/**
 * The rules, each once, in the order of the capabilities and their layers.
 * @param capabilities every capability payload
 * @param slugs the readable addresses
 * @returns the rule lines
 */
export const ruleLines = (capabilities: readonly Capability[], slugs: Slugs): RuleLine[] => {
    const seen = new Set<string>();
    const lines: RuleLine[] = [];
    for (const cap of capabilities) {
        const capSlug = slugs.capability(cap.capability.id);
        for (const layer of cap.layers) {
            const anchors = ruleAnchors(layer.rules);
            for (const rule of layer.rules) {
                if (seen.has(rule.id)) continue;
                seen.add(rule.id);
                lines.push({
                    t: titleOf(rule.says),
                    p: where(rule.place),
                    l: layer.name,
                    c: cap.capability.name,
                    h: `layer/${capSlug}/${slugs.layer(cap.capability.id, layer.id)}.html#${anchors.get(rule.id) ?? ""}`,
                    g: rule.gates,
                });
            }
        }
    }
    return lines;
};
