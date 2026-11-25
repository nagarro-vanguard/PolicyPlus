import { dirname } from "node:path";
import { bundleText, capabilityBundle, surfaceBundle } from "../../../../skills/code-analysis/shared/read/bundle";
import type { Payloads } from "../inputs/payloads";
import type { PlanInput } from "../inputs/plan";
import type { Excerpt } from "./evidence";
import type { Facts } from "./facts";
import type { Hierarchy } from "./hierarchy";
import type { ProposedJourney } from "./journeys";
import { sortByText } from "./text";

/*
 * The texts a reader copies as context. These files are the only place that holds record ids, paths and
 * commands. A capability's and a surface's text is the analysis's own bundle, built by its functions; a rule's text
 * holds that rule's context only; a story's text is the plan skill's file, as it wrote it. Every
 * absolute path is made relative to the folder the run sits in, so no home folder is copied.
 */

export type ContextTexts = {
    /** Each text by its scope (a node key, a story key or a journey address), grouped by kind of scope. */
    texts: Record<string, Record<string, string>>;
    /** The exact size in bytes of each text, by kind and scope. */
    sizes: Record<string, Record<string, number>>;
};

const encoder = new TextEncoder();

/** The capability payload's field that holds the name a surface's bundle is looked up by (a contract field name). */
const bundleNameField = "screen"; // payload field name, allowed by the neutrality scan
const at = (place: { file: string; firstLine: number; lastLine: number }) =>
    place.lastLine > place.firstLine
        ? `${place.file}:${place.firstLine}-${place.lastLine}`
        : `${place.file}:${place.firstLine}`;

/**
 * Make every absolute path under the given roots relative to it.
 * @param text the text
 * @param roots the folders whose paths become relative
 * @returns the text
 */
export const relativize = (text: string, roots: readonly string[]) =>
    roots
        .filter((root) => root !== "" && root !== "/")
        .toSorted((one, other) => other.length - one.length)
        .reduce((result, root) => result.split(`${root.replace(/\/+$/, "")}/`).join(""), text);

/**
 * The text of one rule: what it says, where it is decided, what reaches it, and its code, nothing of the rest of the
 * system.
 */
type Lookups = {
    capabilityName: ReadonlyMap<string, string>;
    actions: ReadonlyMap<string, Facts["actions"][number]>;
    surfaces: ReadonlyMap<string, Facts["surfaces"][number]>;
    rules: ReadonlyMap<string, Facts["rules"][number]>;
};

const lookupsOf = (facts: Facts): Lookups => ({
    capabilityName: new Map(facts.capabilities.map((each) => [each.id, each.name])),
    actions: new Map(facts.actions.map((each) => [each.id, each])),
    surfaces: new Map(facts.surfaces.map((each) => [each.key, each])),
    rules: new Map(facts.rules.map((each) => [each.id, each])),
});

const ruleText = (
    { capabilityName, actions, surfaces }: Lookups,
    rule: Facts["rules"][number],
    excerpt: Excerpt | undefined,
) => {
    const reachers = sortByText(
        rule.actions.map((id) => actions.get(id)).filter((each) => each !== undefined),
        (each) => each.name,
    );
    const tests = rule.reachedByTests.map((key) => surfaces.get(key)?.name ?? key);
    return [
        `# Business rule ${rule.id}`,
        "",
        `Says: ${rule.says}`,
        `Decided in: ${at(rule.place)}`,
        ...(rule.alsoRestsOn.length === 0 ? [] : [`Also rests on: ${rule.alsoRestsOn.map(at).join(", ")}`]),
        `Refuses or blocks something: ${rule.gates ? "yes" : "no"}`,
        ...(rule.reading === "" ? [] : [`Reading: ${rule.reading}${rule.why === "" ? "" : `, because ${rule.why}`}`]),
        `Held by: ${rule.capabilities.length === 0 ? "no capability" : rule.capabilities.map((id) => capabilityName.get(id) ?? id).join(", ")}`,
        ...(reachers.length === 0
            ? []
            : [
                  "",
                  "Reached from:",
                  ...reachers.map(
                      (action) =>
                          `- ${action.name} (${action.id}, ${at(action.place)})${action.purpose === "" ? "" : `: ${action.purpose}`}`,
                  ),
              ]),
        ...(tests.length === 0 ? [] : ["", `Checked by: ${tests.join(", ")}`]),
        ...(excerpt === undefined
            ? []
            : [
                  "",
                  `Code (${excerpt.file}, lines ${excerpt.firstLine}-${excerpt.lastLine}${excerpt.cut ? ", first lines only" : ""}):`,
                  "```",
                  ...excerpt.lines.map((line, number) => `${excerpt.firstLine + number}: ${line}`),
                  "```",
              ]),
    ].join("\n");
};

const actionText = ({ rules }: Lookups, action: Facts["actions"][number], shared: ReadonlySet<string>) => {
    const line = (id: string) => {
        const rule = rules.get(id);
        return rule === undefined ? `- ${id}` : `- ${id}: ${rule.says} (${at(rule.place)})`;
    };
    const common = action.rules.filter((id) => shared.has(id));
    return [
        `# Entry point ${action.id}: ${action.name}`,
        "",
        ...(action.purpose === "" ? [] : [action.purpose]),
        `Started by: ${action.startedBy === "" ? "not recorded" : action.startedBy}`,
        `Where: ${at(action.place)}`,
        "",
        "Rules it applies:",
        ...action.rules.filter((id) => !shared.has(id)).map(line),
        // Rules many places share are named, not repeated: each has its own text.
        ...(common.length === 0 ? [] : ["", `Rules it shares with many other places: ${common.join(", ")}`]),
    ].join("\n");
};

/**
 * Build every context text.
 * @param facts the facts
 * @param payloads the payloads, for the analysis's bundle functions
 * @param hierarchy the hierarchy, for the scope keys
 * @param evidence the excerpts
 * @param plan the plan, when there is one
 * @param journeys the chosen journeys
 * @param roots the folders whose absolute paths must become relative
 * @returns the texts and their sizes
 */
export const contextOf = (
    facts: Facts,
    payloads: Payloads,
    hierarchy: Hierarchy,
    evidence: Record<string, Excerpt>,
    plan: PlanInput | undefined,
    journeys: readonly ProposedJourney[],
    roots: readonly string[],
): ContextTexts => {
    const texts: Record<string, Record<string, string>> = {
        system: {},
        capability: {},
        surface: {},
        action: {},
        rule: {},
        story: {},
        journey: {},
    };
    const raw = {
        system: payloads.system,
        capabilities: payloads.capabilities,
        knowledge: payloads.knowledge,
        index: payloads.index,
    } as never;
    const put = (kind: string, key: string, text: string) => {
        (texts[kind] as Record<string, string>)[key] = `${relativize(text, roots).trimEnd()}\n`;
    };

    const capabilityName = new Map(facts.capabilities.map((each) => [each.id, each.name]));
    put(
        "system",
        "overview",
        [
            `# ${facts.system.name}`,
            "",
            facts.system.purpose,
            ...(facts.system.repository === null
                ? []
                : [
                      "",
                      `Repository: ${facts.system.repository}${facts.system.commit === null ? "" : ` at commit ${facts.system.commit}`}`,
                  ]),
            "",
            "Areas and their capabilities:",
            ...facts.areas.flatMap((area) => [
                `- ${area.name}: ${area.summary}`,
                ...area.capabilities.map((id) => `  - ${capabilityName.get(id) ?? id}`),
            ]),
        ].join("\n"),
    );

    for (const capability of facts.capabilities) {
        const bundle = capabilityBundle(raw, capability.id);
        if (bundle !== undefined)
            put(
                "capability",
                hierarchy.nodeOf.get(capability.id) ?? capability.id,
                bundleText(bundle, () => undefined),
            );
    }
    // The analysis names a surface's bundle by the name its entry points carry in the payload's `bundleNameField`.
    for (const payload of payloads.capabilities) {
        const names = new Map<string, string>();
        for (const layer of payload.layers) {
            for (const action of layer.actions) {
                const name = String((action as Record<string, unknown>)[bundleNameField] ?? "");
                if (action.surface !== undefined && name !== "") names.set(action.surface, name);
            }
        }
        for (const [surface, name] of [...names].sort(([one], [other]) => (one < other ? -1 : 1))) {
            const node = hierarchy.surfaceNode.get(`${payload.capability.id}|${surface}`);
            if (node === undefined) continue;
            const bundle = surfaceBundle(raw, name, payload.capability.id);
            if (bundle !== undefined)
                put(
                    "surface",
                    node,
                    bundleText(bundle, () => undefined),
                );
        }
    }
    const lookups = lookupsOf(facts);
    const shared = new Set(hierarchy.sharedRules);
    for (const action of facts.actions)
        put("action", hierarchy.nodeOf.get(action.id) ?? action.id, actionText(lookups, action, shared));
    for (const rule of facts.rules)
        put("rule", hierarchy.nodeOf.get(rule.id) ?? rule.id, ruleText(lookups, rule, evidence[rule.id]));

    for (const journey of journeys) {
        put(
            "journey",
            journey.slug,
            [
                `# Journey ${journey.id}: ${journey.name}`,
                "",
                `Idea: ${journey.idea}`,
                `Cost: ${journey.tradeoff}`,
                "",
                ...journey.steps.flatMap((step) => [
                    `${step.number}. ${step.intent} (${step.id}, ${step.change})`,
                    `   The system: ${step.system}`,
                    ...(step.kept.length === 0 ? [] : [`   Keeps rules: ${step.kept.join(", ")}`]),
                    ...step.changes.map((change) => `   Changes rule ${change.rule}: ${change.to}`),
                ]),
                ...(journey.drops.length === 0
                    ? []
                    : [
                          "",
                          "Left out:",
                          ...journey.drops.map(
                              (drop) =>
                                  `- ${drop.reason} (entry points ${drop.actions.join(", ")}; rules ${drop.rules.join(", ") || "none"})`,
                          ),
                      ]),
            ].join("\n"),
        );
    }

    // A story's text is the plan skill's own file, taken as it is.
    for (const [key, text] of plan?.attachments ?? []) put("story", key, text);

    const sizes = Object.fromEntries(
        Object.entries(texts).map(([kind, byKey]) => [
            kind,
            Object.fromEntries(Object.entries(byKey).map(([key, text]) => [key, encoder.encode(text).length])),
        ]),
    );
    return { texts, sizes };
};

/** The folder a run's output root sits in: its paths are made relative to it. */
export const parentOf = (folder: string) => dirname(folder.replace(/\/+$/, ""));
