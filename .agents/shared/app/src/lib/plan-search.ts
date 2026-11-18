import { coveragePath, epicPath, epicsInOrder, foundationPath, planHomePath, storiesInOrder, storyPath } from "./plan";
import type { Plan } from "./plan";

/**
 * What the search finds of a plan: its home, foundation and coverage pages, every epic and every story, with the words a
 * person would search for in each.
 * @param plan the plan
 * @param words the kinds' names as the search lists them
 * @param words.searchPlan the kind of the plan's own pages
 * @param words.searchEpics the kind of the epics
 * @param words.searchStories the kind of the stories
 * @param words.title the plan's title
 * @param words.foundationTitle the foundation page's title
 * @param words.coverageTitle the coverage page's title
 * @returns the entries, in the shape of the search index
 */
export const planSearchEntries = (
    plan: Plan,
    words: {
        readonly searchPlan: string;
        readonly searchEpics: string;
        readonly searchStories: string;
        readonly title: string;
        readonly foundationTitle: string;
        readonly coverageTitle: string;
    },
) => [
    { k: words.searchPlan, t: `${words.title} ${plan.phases.map((phase) => phase.name).join(" ")}`, l: words.title, h: `${planHomePath}.html` },
    {
        k: words.searchPlan,
        t: `${words.foundationTitle} ${plan.layers.map((layer) => layer.name).join(" ")} ${plan.decisions.map((decision) => decision.chose).join(" ")}`,
        l: words.foundationTitle,
        h: `${foundationPath}.html`,
    },
    { k: words.searchPlan, t: words.coverageTitle, l: words.coverageTitle, h: `${coveragePath}.html` },
    ...epicsInOrder(plan).map((epic) => ({ k: words.searchEpics, t: `${epic.title} ${epic.outcome}`, l: epic.title, h: `${epicPath(epic)}.html` })),
    ...storiesInOrder(plan).map((story) => ({
        k: words.searchStories,
        t: `${story.title} ${story.what} ${story.why} ${story.terms.map((term) => term.name).join(" ")}`,
        l: story.title,
        h: `${storyPath(story)}.html`,
    })),
];
