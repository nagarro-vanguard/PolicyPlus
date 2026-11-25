import type { Epic, Plan, StoryView } from "../model/plan";
import { LABELS } from "./labels";

const section = (heading: string, lines: readonly string[]) =>
    lines.length === 0 ? [] : [`## ${heading}`, "", ...lines, ""];
const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`);

/**
 * A story's body: a fixed set of sections laid out from the plan's data, each left out when it has nothing. The text
 * is the writer's, verbatim; nothing here is worded, cut or joined.
 * @param view the story
 * @param plan the plan
 * @returns the markdown from the first `##`
 */
export const storyBody = (view: StoryView, plan: Plan) => {
    const titleOf = new Map(plan.stories.map((story) => [story.key as string, story.title]));
    const before = [...new Set([...view.reliesOn.map((each) => each.builtBy), ...view.blockedBy])].flatMap(
        (key) => titleOf.get(key) ?? [],
    );
    const others =
        view.kind === "functional"
            ? plan.stories.filter(
                  (story) =>
                      story.key !== view.key &&
                      story.kind === "functional" &&
                      story.surface === view.surface &&
                      story.capability === view.capability,
              )
            : [];
    const journey = view.journey;
    return [
        ...section(LABELS.goal, [view.what]),
        ...section(LABELS.why, [view.why]),
        ...section(
            LABELS.criteria,
            view.criteria.flatMap((c, at) => (at === 0 ? [c.says] : ["", c.says])),
        ),
        ...section(LABELS.open, bullets(view.open ?? [])),
        ...section(LABELS.dependsOn, bullets(before)),
        ...section(LABELS.terms, bullets(view.terms.map((term) => `${term.name}: ${term.means}`))),
        ...(view.kind === "functional" && journey
            ? section(LABELS.journey, [journey.name, "", ...journey.steps.map((step, at) => `${at + 1}. ${step}`)])
            : []),
        ...section(LABELS.outOfScope, bullets(others.map((story) => story.title))),
    ]
        .join("\n")
        .trim();
};

/**
 * An epic's body, from the plan's data alone: its outcome, its stories, what it comes after, and for an area the
 * decisions' own reasons and choices.
 * @param epic the epic
 * @param plan the plan
 * @returns the markdown from the first `##`
 */
export const epicBody = (epic: Epic, plan: Plan) => {
    const stories = plan.stories.filter((story) => story.epic === epic.key);
    const terms = stories.flatMap((story) => story.terms);
    const titleOf = new Map(plan.epics.map((each) => [each.key, each.title]));
    const decisions = plan.decisions.filter((d) => d.topic._tag === "area" && d.topic.name === epic.area);
    return [
        ...section(LABELS.outcome, [epic.outcome]),
        ...section(LABELS.stories, bullets(stories.map((story) => story.title))),
        ...section(LABELS.comesAfter, bullets(epic.comesAfter.map((key) => titleOf.get(key) ?? key))),
        ...section(LABELS.reasons, bullets(decisions.map((d) => d.reason))),
        ...section(LABELS.design, bullets(decisions.map((d) => d.chose))),
        ...section(LABELS.terms, bullets(terms.map((term) => `${term.name}: ${term.means}`))),
    ]
        .join("\n")
        .trim();
};
