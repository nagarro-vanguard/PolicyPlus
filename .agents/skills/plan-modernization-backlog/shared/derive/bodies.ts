import type { Epic, Plan, StoryView } from "../model/plan";

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
        ...section("Goal", [view.what]),
        ...section("Why", [view.why]),
        ...section(
            "Acceptance criteria",
            view.criteria.flatMap((c, at) => (at === 0 ? [c.says] : ["", c.says])),
        ),
        ...section("Open questions", bullets(view.open ?? [])),
        ...section("Depends on", bullets(before)),
        ...section("Terminologies", bullets(view.terms.map((term) => `${term.name}: ${term.means}`))),
        ...(view.kind === "functional" && journey
            ? section("Journey", [
                  `**Journey:** ${journey.name}`,
                  "",
                  "**After:**",
                  "",
                  ...journey.steps.map((step, at) => `${at + 1}. ${step}`),
              ])
            : []),
        ...section("Out of scope", bullets(others.map((story) => story.title))),
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
