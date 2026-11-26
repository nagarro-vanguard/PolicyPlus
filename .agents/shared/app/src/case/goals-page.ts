import { caseData } from "./data";
import { type GoalsPageView, goalsFileOf, goalsPageOf } from "./goals-view";
import { journeysView } from "./journeys";
import { theCase } from "./loader";
import { planViewOf } from "./plan-view";
import { siteOf } from "./site";

// The goals as the pages need them, read from the case once: the Goals section's and the goal pages' view. A case with
// no goals gives no view. Chips on other sections' pages come from goals-view.ts's pure lookups, so those views can use them.

let viewCached: Promise<GoalsPageView | null> | undefined;

/**
 * The Goals section's view.
 * @returns the view, or null when the case holds no goals
 */
export const goalsPage = (): Promise<GoalsPageView | null> => {
    viewCached ??= (async () => {
        const file = goalsFileOf(theCase());
        if (file === null) return null;
        const site = await siteOf();
        const titles = new Map((await journeysView()).journeys.map((journey) => [journey.slug, journey.title]));
        const plan = planViewOf(theCase(), await caseData(), site.sections);
        const stories = new Map((plan?.stories ?? []).map((story) => [story.n, story.title]));
        return goalsPageOf(file, {
            journeyTitle: (slug) => titles.get(slug),
            storyTitle: (n) => stories.get(n),
            sections: new Set(site.nav.map((section) => section.id)),
        });
    })();
    return viewCached;
};
