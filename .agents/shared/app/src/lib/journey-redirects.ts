import type { Redirect } from "./architecture-redirects";
import { journeySlugs } from "./journey-join";
import { journeyCopy } from "./journey-copy";
import type { TargetData } from "./target-types";
import { slugify } from "./slugs";

// The pages this part of the site no longer has, each a small page that sends the reader on: the target's home, a task of the
// target, and an area. One list for the routes and for the tests; the type and the page are the Architecture page's.

/**
 * The redirects every build has: an area's page now lives in the list of capabilities and screens.
 * @param areas the slugs of the areas
 * @returns one redirect per area
 */
export const areaRedirects = (areas: readonly string[]): readonly Redirect[] =>
    areas.map((slug) => ({ from: `area/${slug}`, to: `reference.html#${slug}`, text: journeyCopy.reference.title }));

/**
 * The redirects of a build with a target: its home page, and each task's page, now a journey.
 * @param data the target's records
 * @returns the redirects
 */
export const journeyRedirects = (data: TargetData): readonly Redirect[] => {
    const slugs = journeySlugs(data.tasks.map((task) => task.id));
    return [
        { from: "target", to: "decisions.html", text: journeyCopy.decisions.title },
        ...data.tasks.map((task) => ({ from: `target/task/${slugify(task.id)}`, to: `journey/${slugs.get(task.id) ?? slugify(task.id)}.html`, text: "The journey" })),
    ];
};
