import type { Goal, MarkState, Stage } from "../../compose/build/goals";
import { copy, goalCoverageWords, goalStageWords } from "../lib/copy";
import type { Case } from "./read";

// What the Goals section shows: for each goal the person wrote, in their own words, the mark of every stage of the work
// (journeys, architecture, foundation decisions, stories) with a word the app owns, and links to the pages that hold what
// each stage said. It only follows keys; the marks and links are the case's own (goals/goals.json, made by compose). The
// work stops at the plan, so nothing here says a goal is built or met. The pure parts take the case's goals and a few
// lookups, so they are tested without a built case.

export type GoalsFile = { goalsSha: string; goals: Goal[] };

export type Link = { name: string; href?: string };

export type MarkView = {
    stage: Stage;
    stageWord: string;
    state: MarkState;
    word: string;
    badge: (typeof goalCoverageWords)[MarkState]["badge"];
    /** The page that holds the stage's work, below the site's root: the section, or the goal's own page when it has none. */
    href: string;
    /** What the stage says about it, in one app sentence, when there is something to say beyond the word. */
    line: string | null;
    links: Link[];
};

export type GoalView = {
    number: number;
    key: string;
    /** The goal's page below the site's root. */
    page: string;
    label: string;
    /** The goal as the person wrote it. */
    text: string;
    summary: Goal["summary"];
    summaryWord: string;
    summaryBadge: (typeof goalCoverageWords)[MarkState]["badge"];
    marks: MarkView[];
    stale: boolean;
    answer: { how: string; where: Link[] } | null;
    decision: { chose: string; layer: string; reason: string } | null;
    stories: Link[];
    journeys: Link[];
    epics: number;
    components: number;
};

export type GoalsPageView = { goals: GoalView[]; stale: boolean };

/** A short mention of a goal on another page: its number and label, the full words on hover, a link to its page. */
export type GoalChip = { number: number; label: string; text: string; href: string };

/** What the view needs from the rest of the case, by key. */
export type GoalLookups = {
    /** The title of a journey, by its slug. */
    journeyTitle: (slug: string) => string | undefined;
    /** The title of a story, by its place in the plan. */
    storyTitle: (n: number) => string | undefined;
    /** The sections the site has; a link into one that is absent is dropped. */
    sections: ReadonlySet<string>;
};

/** The address of a goal's page below the site's root. */
export const goalPageOf = (number: number) => `goal/${number}.html`;

const slugOf = (key: string) => key.slice(key.indexOf("/") + 1);

const wordsOf = (state: string) => {
    const words = goalCoverageWords[state as MarkState] as (typeof goalCoverageWords)[MarkState] | undefined;
    if (words === undefined) throw new Error(`a goal carries the state "${state}", which the app has no plain words for (src/lib/copy.ts)`);
    return words;
};

/**
 * The view of the goals.
 * @param file the case's goals
 * @param lookups the titles of journeys and stories and the sections present
 * @returns each goal with its marks, words and links
 */
export const goalsPageOf = (file: GoalsFile, lookups: GoalLookups): GoalsPageView => {
    const goals = file.goals.map((goal): GoalView => {
        const page = goalPageOf(goal.number);
        const summary = wordsOf(goal.summary);
        const journeyLinks = goal.journeys.map((key): Link => {
            const title = lookups.journeyTitle(slugOf(key));
            return {
                name: title ?? slugOf(key),
                ...(lookups.sections.has("journeys") && title !== undefined ? { href: `journey/${slugOf(key)}.html` } : {}),
            };
        });
        const storyLinks = goal.stories.map((key): Link => {
            const n = Number(slugOf(key));
            return {
                name: lookups.storyTitle(n) ?? `Story ${n}`,
                ...(lookups.sections.has("plan") ? { href: `plan.html#story=${n}` } : {}),
            };
        });
        const where = (goal.answer?.where ?? []).map((place): Link => ({
            name: place.name,
            ...(place.node !== null && lookups.sections.has("architecture") ? { href: "architecture.html#proposed" } : {}),
        }));
        const marks = (["journeys", "architecture", "foundation", "stories"] as const).map((stage): MarkView => {
            const mark = goal.marks[stage];
            const words = wordsOf(mark.state);
            const links: Link[] =
                stage === "journeys"
                    ? journeyLinks
                    : stage === "architecture"
                      ? where
                      : stage === "foundation"
                        ? mark.targets.length === 0 ? [] : [{ name: copy.goals.decisionTitle, href: `${page}#decision` }]
                        : storyLinks;
            const section = (id: string, href: string) => (lookups.sections.has(id) ? href : `${page}#stage-${stage}`);
            const href =
                stage === "journeys"
                    ? section("journeys", "journeys.html")
                    : stage === "architecture"
                      ? section("architecture", "architecture.html#proposed")
                      : stage === "foundation"
                        ? `${page}#decision`
                        : section("plan", "plan.html");
            const line =
                mark.state === "settled"
                    ? copy.goals.settledLine
                    : mark.state === "notReached"
                      ? copy.goals.notReachedLine
                      : mark.state === "stale"
                        ? copy.goals.staleNote
                        : null;
            return { stage, stageWord: goalStageWords[stage], state: mark.state, word: words.word, badge: words.badge, href, line, links };
        });
        return {
            number: goal.number,
            key: goal.key,
            page,
            label: goal.label,
            text: goal.text,
            summary: goal.summary,
            summaryWord: summary.summary,
            summaryBadge: summary.badge,
            marks,
            stale: marks.some((mark) => mark.state === "stale"),
            answer: goal.answer === null ? null : { how: goal.answer.how, where },
            decision: goal.decision === null ? null : { chose: goal.decision.chose, layer: goal.decision.layer, reason: goal.decision.reason },
            stories: storyLinks,
            journeys: journeyLinks,
            epics: goal.epics.length,
            components: goal.components.length,
        };
    });
    return { goals, stale: goals.some((goal) => goal.stale) };
};

const chipOf = (goal: Goal): GoalChip => ({ number: goal.number, label: goal.label, text: goal.text, href: goalPageOf(goal.number) });

/** Which goals a page of another section serves: a chip each, only for the goals that link there. */
export type GoalIndex = {
    forJourney: (slug: string) => GoalChip[];
    forStory: (n: number) => GoalChip[];
    forPlace: (name: string) => GoalChip[];
    /** The goals the chosen architecture answers. */
    answered: () => GoalChip[];
};

/**
 * The lookups of chips by what a goal links to.
 * @param file the case's goals, or nothing when the case holds none
 * @returns the lookups; each gives nothing for a case with no goals
 */
export const goalIndexOf = (file: GoalsFile | null): GoalIndex => {
    const goals = file?.goals ?? [];
    const pick = (test: (goal: Goal) => boolean) => goals.filter(test).map(chipOf);
    return {
        forJourney: (slug) => pick((goal) => goal.journeys.includes(`journey/${slug}`)),
        forStory: (n) => pick((goal) => goal.stories.includes(`story/${n}`)),
        forPlace: (name) => pick((goal) => goal.answer?.where.some((place) => place.name === name) === true),
        answered: () => pick((goal) => goal.answer !== null),
    };
};

/**
 * The case's goals, when it holds any.
 * @param kase the case
 * @returns the goals, or null
 */
export const goalsFileOf = (kase: Case): GoalsFile | null =>
    kase.has("goals/goals.json") ? (kase.json("goals/goals.json") as GoalsFile) : null;
