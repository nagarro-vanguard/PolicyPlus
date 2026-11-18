import type { Epic, Plan, StoryView } from "../model/plan";
import type { Facts } from "./facts";

const lowerFirst = (text: string) => (text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1));
const whoOf = (view: StoryView, facts: Facts) => {
    const starter = facts.capabilities
        .flatMap((c) => c.surfaces.flatMap((s) => s.actions))
        .find((a) => a.id === view.actions[0])?.startedBy;
    return starter === "schedule"
        ? "the system, on its schedule"
        : starter === "otherSystem"
          ? "another system"
          : "a person using the product";
};
const acTitle = (says: string) => {
    const then = says.split(/\bthen\b/i)[1] ?? says;
    const words = then
        .replace(/[.\s]+$/, "")
        .trim()
        .split(/\s+/)
        .slice(0, 9)
        .join(" ");
    return words.charAt(0).toUpperCase() + words.slice(1);
};
const section = (heading: string, lines: readonly string[]) =>
    lines.length === 0 ? [] : [`## ${heading}`, "", ...lines, ""];
const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`);

/**
 * A story's body in the shape of its template, from the plan's data alone: nothing here is reworded by a model.
 * @param view the story
 * @param plan the plan
 * @param facts the analysis facts
 * @returns the markdown from the first `##`
 */
export const storyBody = (view: StoryView, plan: Plan, facts: Facts) => {
    const titleOf = new Map(plan.stories.map((story) => [story.key as string, story.title]));
    const sameSurface = plan.stories.filter(
        (story) =>
            story.key !== view.key &&
            story.kind === "functional" &&
            story.surface === view.surface &&
            story.capability === view.capability,
    );
    const outOfScope =
        sameSurface.length > 0
            ? [
                  `The other tasks of this part of the product have their own stories: ${sameSurface.map((s) => s.title).join("; ")}.`,
              ]
            : [];
    const terms = view.terms.map((term) => `${term.name}: ${term.means}`);
    if (view.kind === "functional") {
        const relies = [...new Set(view.reliesOn.map((each) => titleOf.get(each.builtBy) ?? ""))].filter(Boolean);
        return [
            ...section("Story", [
                `As ${whoOf(view, facts)}, I want ${lowerFirst(view.what)}, so that ${lowerFirst(view.why)}.`,
            ]),
            ...section("Context", [
                `This ports behaviour of the existing product, described in the attachment: ${view.builds.length} rules it must keep and the reading of the code behind them.`,
                ...(relies.length > 0
                    ? ["", `It relies on behaviour that other stories build first: ${relies.join("; ")}.`]
                    : []),
                ...((view.open ?? []).length > 0
                    ? ["", "Open points, to settle before it is built:", ...bullets(view.open ?? [])]
                    : []),
            ]),
            ...section(
                "Acceptance criteria",
                view.criteria.flatMap((c, at) => [`**AC-${at + 1}: ${acTitle(c.says)}.**`, c.says, ""]).slice(0, -1),
            ),
            ...section("Terminologies", bullets(terms)),
            ...(view.journey
                ? section("Journey", [
                      `**Journey:** ${view.journey.name}`,
                      "",
                      "**Before:**",
                      "",
                      "New journey",
                      "",
                      "**After:**",
                      "",
                      ...view.journey.steps.map((step, at) => `${at + 1}. ${step}`),
                  ])
                : []),
            ...section("Out of scope", outOfScope),
        ]
            .join("\n")
            .trim();
    }
    const layerPaths = plan.layers.map((layer) => `${layer.path} (the ${layer.name} layer)`);
    return [
        ...section("Problem", bullets([view.why, ...(view.open ?? []).map((question) => `Open point: ${question}`)])),
        ...section("Goal", bullets([view.what])),
        ...section("Acceptance criteria", bullets(view.criteria.map((c) => c.says))),
        ...section(
            "Scope",
            bullets(
                view.builder === "scaffold-codebase"
                    ? ["the workspace root", ...layerPaths]
                    : layerPaths.length > 0
                      ? layerPaths
                      : ["the workspace root"],
            ),
        ),
        ...section("Terminologies", bullets(terms)),
        ...section("Out of scope", bullets(["Anything a later story builds on top of this."])),
    ]
        .join("\n")
        .trim();
};

/**
 * An epic's body in the shape of its template, from the plan's data alone.
 * @param epic the epic
 * @param plan the plan
 * @returns the markdown from the first `##`
 */
export const epicBody = (epic: Epic, plan: Plan) => {
    const stories = plan.stories.filter((story) => story.epic === epic.key);
    const terms = stories.flatMap((story) => story.terms);
    const table = [
        "| Term | Change | Today | Proposed |",
        "| --- | --- | --- | --- |",
        ...terms.map((term) => `| ${term.name} | new | none: new in this codebase | ${term.means} |`),
    ];
    const titleOf = new Map(plan.epics.map((each) => [each.key, each.title]));
    if (epic.kind === "functional") {
        const surfaces = [
            ...new Set(stories.map((story) => story.surface).filter((s): s is string => s !== undefined)),
        ];
        const journeys = stories.flatMap((story) =>
            story.journey ? [`${story.journey.name}: a new journey in this codebase.`] : [],
        );
        return [
            ...section("Outcome", [epic.outcome]),
            ...section("Scope", [
                `This epic covers: ${surfaces.join("; ")}.`,
                "",
                "Out of scope: anything outside this capability of the existing product.",
            ]),
            ...section("Where it meets what exists", [
                "The codebase starts empty. It reuses what the earlier epics build: " +
                    (epic.comesAfter.map((key) => titleOf.get(key) ?? key).join("; ") || "nothing") +
                    ".",
            ]),
            ...section("Journeys", bullets(journeys)),
            ...(terms.length > 0 ? section("Terminologies", table) : []),
        ]
            .join("\n")
            .trim();
    }
    const decisions = plan.decisions.filter((d) => d.topic._tag === "area" && d.topic.name === epic.area);
    const none = "No finding: decided at build.";
    return [
        ...section("Outcome", [epic.outcome]),
        ...section("Scope", [
            "The layers and paths named in its stories.",
            "",
            "Out of scope: the product's own behaviour.",
        ]),
        ...section("Comes after", bullets(epic.comesAfter.map((key) => titleOf.get(key) ?? key))),
        ...section("What we found", bullets(decisions.map((d) => d.reason))),
        ...section("Design", bullets(decisions.map((d) => d.chose))),
        ...["Data modelling", "Scale", "Security", "Isolation", "Performance", "Durability"].flatMap((heading) =>
            section(heading, [none]),
        ),
        ...(terms.length > 0 ? section("Terminologies", table) : []),
    ]
        .join("\n")
        .trim();
};
