import { ComposeError } from "../errors";
import type { Payloads } from "../inputs/payloads";
import type { PlanFile, PlanStory } from "../inputs/plan";
import type { Facts } from "./facts";
import { sortByText } from "./text";

/*
 * The rule by rule part of a story's text for an assistant. A story's text already holds the story, how to deliver it
 * and its legacy attachment (the plan's own file, read as it is); this adds, for every rule the story builds, what a
 * builder needs to build it and to check it, and, for every rule it only relies on, the rule's wording, its place and
 * the story that builds it. Every line comes from a field the analysis and the plan already hold; nothing is invented:
 * a line whose field is empty for a rule is left out. The attachment does not tell a fact the code states from a
 * reading a model made, so neither does this.
 */

type Place = { file: string; firstLine: number; lastLine: number };
type Rule = Facts["rules"][number];

const at = (place: Place) =>
    place.lastLine > place.firstLine ? `${place.file}:${place.firstLine}-${place.lastLine}` : `${place.file}:${place.firstLine}`;

/** What the text of every story is built from, read once. */
export type StoryContext = {
    rules: ReadonlyMap<string, Rule>;
    capabilityName: ReadonlyMap<string, string>;
    /** The block each rule is decided in, with the block's own words. */
    blockOf: ReadonlyMap<string, { name: string; container: string; place: Place | null }>;
    /** The data each rule's block reads and saves, by rule. */
    dataOf: ReadonlyMap<string, { reads: string[]; saves: string[] }>;
    /** The change of state each rule gates, by rule. */
    transitionOf: ReadonlyMap<string, { entity: string; from: string; to: string; place: Place }>;
    /** The places (as the capabilities' payloads name them) each rule is reached in, by rule. */
    placesOf: ReadonlyMap<string, string[]>;
    storyTitle: ReadonlyMap<string, string>;
};

/**
 * Index what the rule by rule part reads.
 * @param facts the facts
 * @param payloads the analysis's payloads
 * @param plan the plan
 * @returns the index
 */
export const contextOf = (facts: Facts, payloads: Payloads, plan: PlanFile): StoryContext => {
    const index = payloads.index;
    const blocks = new Map(index.blocks.map((block) => [block.id, block]));
    const blockOf = new Map<string, { name: string; container: string; place: Place | null }>();
    const dataOf = new Map<string, { reads: string[]; saves: string[] }>();
    const transitionOf = new Map<string, { entity: string; from: string; to: string; place: Place }>();
    const access = new Map<string, { reads: Set<string>; saves: Set<string> }>();
    for (const each of index.access ?? []) {
        const known = access.get(each.block) ?? { reads: new Set<string>(), saves: new Set<string>() };
        (each.kind === "saves" ? known.saves : known.reads).add(each.entity.name);
        access.set(each.block, known);
    }
    const transitions = new Map(
        (index.lifecycles ?? []).flatMap((life) =>
            life.transitions.map(
                (transition) =>
                    [
                        transition.id,
                        {
                            entity: life.entity.name,
                            from: transition.from.map((n) => life.states[n - 1] ?? "").join(" or ") || "created",
                            to: life.states[transition.to - 1] ?? "",
                            place: { file: transition.file, firstLine: transition.firstLine, lastLine: transition.lastLine },
                        },
                    ] as const,
            ),
        ),
    );
    for (const rule of index.rules) {
        const block = rule.block === undefined ? undefined : blocks.get(rule.block);
        if (block !== undefined)
            blockOf.set(rule.id, {
                name: block.name,
                container: block.container ?? "",
                place:
                    block.firstLine === undefined || block.lastLine === undefined
                        ? null
                        : { file: block.file, firstLine: block.firstLine, lastLine: block.lastLine },
            });
        const touched = rule.block === undefined ? undefined : access.get(rule.block);
        if (touched !== undefined) dataOf.set(rule.id, { reads: [...touched.reads].sort(), saves: [...touched.saves].sort() });
        const gated = rule.gates === undefined || rule.gates === "" ? undefined : transitions.get(rule.gates);
        if (gated !== undefined) transitionOf.set(rule.id, gated);
    }
    const places = new Map<string, Set<string>>();
    for (const payload of payloads.capabilities)
        for (const layer of payload.layers)
            for (const rule of layer.rules)
                for (const name of rule.screens ?? []) {
                    const known = places.get(rule.id) ?? new Set<string>();
                    known.add(name);
                    places.set(rule.id, known);
                }
    return {
        rules: new Map(facts.rules.map((rule) => [rule.id, rule])),
        capabilityName: new Map(facts.capabilities.map((each) => [each.id, each.name])),
        blockOf,
        dataOf,
        transitionOf,
        placesOf: new Map([...places].map(([id, names]) => [id, [...names].sort()])),
        storyTitle: new Map(plan.stories.map((story) => [story.key, story.title])),
    };
};

/** What the rule by rule part says of one rule the story builds, and the places it cites. */
const builtBlock = (context: StoryContext, story: PlanStory, rule: Rule, number: number) => {
    const block = context.blockOf.get(rule.id);
    const data = context.dataOf.get(rule.id);
    const change = context.transitionOf.get(rule.id);
    const places = context.placesOf.get(rule.id) ?? [];
    const citedBy = story.criteria.flatMap((criterion, order) =>
        (criterion.from ?? []).some((ref) => ref._tag === "rule" && ref.id === rule.id) ? [`AC-${order + 1}`] : [],
    );
    const caps = rule.capabilities.map((id) => context.capabilityName.get(id) ?? id);
    const lines = [
        `### Rule ${number}: ${rule.says}`,
        "",
        `- Decided in: ${at(rule.place)}`,
        ...(rule.alsoRestsOn.length === 0 ? [] : [`- Also rests on: ${rule.alsoRestsOn.map(at).join(", ")}`]),
        ...(block === undefined
            ? []
            : [
                  `- Block: ${block.name}${block.container === "" ? "" : ` in ${block.container}`}${block.place === null ? "" : ` (${at(block.place)})`}`,
              ]),
        ...(rule.reading === "corrected" || rule.reading === "disputed"
            ? [`- Doubt: the review ${rule.reading} this rule${rule.why === "" ? "" : `: ${rule.why}`}`]
            : []),
        `- Refuses or blocks something: ${rule.gates ? "yes" : "no"}`,
        `- Held by: ${caps.length === 0 ? "no capability" : caps.join(", ")}`,
        ...(places.length === 0 ? [] : [`- Reached in: ${places.join(", ")}`]),
        ...(data === undefined
            ? []
            : [
                  `- Data its block touches: ${[
                      ...(data.reads.length === 0 ? [] : [`reads ${data.reads.join(", ")}`]),
                      ...(data.saves.length === 0 ? [] : [`saves ${data.saves.join(", ")}`]),
                  ].join("; ")}`,
              ]),
        ...(change === undefined
            ? []
            : [`- Gates the change of state of ${change.entity}: ${change.from} to ${change.to} (${at(change.place)})`]),
        `- Cited by: ${citedBy.length === 0 ? "no criterion" : citedBy.join(", ")}`,
    ];
    return { text: lines.join("\n"), spans: [rule.place, ...rule.alsoRestsOn].map((place) => ({ id: rule.id, place })) };
};

/**
 * The rule by rule part of one story's text, and the places it cites.
 * @param context the index
 * @param story the story
 * @returns the text, and the rules and places it holds
 */
export const storyRuleText = (context: StoryContext, story: PlanStory) => {
    const missing = (id: string): never => {
        throw new ComposeError("build", `story ${story.key}: rule ${id} is in no fact`);
    };
    const built = story.builds.map((id) => context.rules.get(id) ?? missing(id));
    const relied = story.reliesOn.map((each) => ({ rule: context.rules.get(each.rule) ?? missing(each.rule), builtBy: each.builtBy }));
    const parts = built.map((rule, at) => builtBlock(context, story, rule, at + 1));
    const text = [
        ...(built.length === 0
            ? []
            : [
                  "## Rule by rule: what this story builds",
                  "",
                  "Each rule below is built by this story. Read it with the criteria that cite it.",
                  "",
                  ...parts.flatMap((part) => [part.text, ""]),
              ]),
        ...(relied.length === 0
            ? []
            : [
                  "## Rule by rule: what this story relies on",
                  "",
                  "Built by another story; the wording and the place only.",
                  "",
                  ...sortByText(relied, (each) => each.rule.place.file, (each) => String(each.rule.place.firstLine).padStart(8, "0")).map(
                      (each) =>
                          `- ${each.rule.says} (${at(each.rule.place)}) Built by: ${context.storyTitle.get(each.builtBy) ?? each.builtBy}.`,
                  ),
                  "",
              ]),
    ].join("\n");
    const spans = [...parts.flatMap((part) => part.spans), ...relied.map((each) => ({ id: each.rule.id, place: each.rule.place }))];
    return {
        text,
        built,
        relied: relied.map((each) => each.rule),
        spans,
        /** The wording and place of every rule the story names, as the text must hold them. */
        required: [...built, ...relied.map((each) => each.rule)].map((rule) => ({ id: rule.id, says: rule.says, at: at(rule.place) })),
    };
};
