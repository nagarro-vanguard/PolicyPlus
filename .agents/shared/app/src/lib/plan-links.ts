import type { Slugs } from "./slugs";
import { screenHref } from "./payloads";
import type { Capability, System } from "./types";

export type Link = { readonly text: string; readonly href: string };

/**
 * A lookup from an action id to what the analysis says of it and where its pages are. An id the analysis does not know
 * gives nothing: a link is made only where it resolves exactly, never by a guess from names.
 * @param sys the system payload
 * @param capabilities every capability payload
 * @param slugs the addresses of the analysis pages
 * @param root the path from the page to the site's root
 * @returns the lookup
 */
export const actionLookup = (sys: System, capabilities: readonly Capability[], slugs: Slugs, root: string) => {
    const found = new Map<
        string,
        { purpose: string; capability: Link; action: Link; screen: Link | undefined }
    >();
    for (const cap of capabilities) {
        const capSlug = slugs.capability(cap.capability.id);
        for (const layer of cap.layers) {
            for (const action of layer.actions) {
                const screen = sys.screens.find((each) => each.actionIds.includes(action.id));
                found.set(action.id, {
                    purpose: action.purpose,
                    capability: { text: cap.capability.name, href: `${root}capability/${capSlug}.html` },
                    action: {
                        text: action.purpose,
                        href: `${root}action/${capSlug}/${slugs.action(cap.capability.id, action.id)}.html`,
                    },
                    screen: screen === undefined ? undefined : { text: screen.name, href: screenHref(root, screen.key) },
                });
            }
        }
    }
    return (id: string) => found.get(id);
};

export type ActionLookup = ReturnType<typeof actionLookup>;

/**
 * The pages of the analysis a story came from, resolved from the actions it ports: their capabilities, their screens and
 * the actions themselves, each once, in the order the actions are listed.
 * @param actions the action ids of the story
 * @param lookup the action lookup
 * @returns the links
 */
export const analysisLinksOf = (actions: readonly string[], lookup: ActionLookup) => {
    const once = (links: readonly Link[]) => [...new Map(links.map((link) => [link.href, link] as const)).values()];
    const known = actions.flatMap((id) => {
        const hit = lookup(id);
        return hit === undefined ? [] : [hit];
    });
    return {
        capabilities: once(known.map((hit) => hit.capability)),
        screens: once(known.flatMap((hit) => (hit.screen === undefined ? [] : [hit.screen]))),
        actions: once(known.map((hit) => hit.action)),
        unresolved: actions.length - known.length,
    };
};

/**
 * A lookup from a business rule's id to the place in the code that decides it, as `file:line`. A rule the analysis does
 * not hold gives nothing.
 * @param capabilities every capability payload
 * @returns the lookup
 */
export const ruleLookup = (capabilities: readonly Capability[]) => {
    const found = new Map<string, string>();
    for (const cap of capabilities) {
        for (const layer of cap.layers) {
            for (const rule of layer.rules) {
                if (!found.has(rule.id)) found.set(rule.id, `${rule.place.file}:${rule.place.firstLine}`);
            }
        }
    }
    return (id: string): string | undefined => found.get(id);
};

export type RuleLookup = ReturnType<typeof ruleLookup>;
