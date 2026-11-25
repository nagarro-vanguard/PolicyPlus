import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import type { Plan, StoryView } from "../model/plan";
import type { ModernizationRequest } from "../model/request";
import type { Target } from "../read/target";
import { storyBody } from "./bodies";
import { LABELS } from "./labels";
import type { Facts, Place } from "./facts";
import { componentLayer } from "./layers";

/** A reader of the legacy code the request names: its lines by file, or nothing for a file that is not there. */
export const sourceReaderOf = (roots: readonly string[]) => {
    const files = new Map<string, string[] | null>();
    const lines = (file: string): string[] | null => {
        if (files.has(file)) return files.get(file) ?? null;
        let read: string[] | null = null;
        for (const root of roots) {
            const full = normalize(join(root, file));
            try {
                if (full.startsWith(normalize(root) + sep) && statSync(full).isFile()) {
                    read = readFileSync(full, "utf8").split(/\r?\n/);
                    break;
                }
            } catch {
                // not under this root
            }
        }
        files.set(file, read);
        return read;
    };
    return { readable: roots.some((root) => existsSync(root)), lines };
};
export type SourceReader = ReturnType<typeof sourceReaderOf>;

export type ContextInputs = {
    readonly plan: Plan;
    readonly facts: Facts;
    readonly request: ModernizationRequest;
    readonly target: Target | undefined;
    readonly source: SourceReader;
    /** The reading of each surface the story's entry points belong to: its title and its text. */
    readonly readings: readonly { readonly title: string; readonly text: string }[];
};

const at = (place: Place) => `${place.file}:${place.firstLine}-${place.lastLine}`;
const ID = /\b[a-z]+(?:-[a-z]+)*-\d{8,}\b/g;

/** A fence longer than any run of backticks the code holds. */
const fenced = (lines: readonly string[]) => {
    const longest = Math.max(0, ...lines.flatMap((line) => [...line.matchAll(/`+/g)].map((run) => run[0].length)));
    const fence = "`".repeat(Math.max(3, longest + 1));
    return [fence, ...lines, fence].join("\n");
};

/**
 * One story's context as markdown for a person to read: the story as the tracker holds it, then the evidence a builder
 * needs, then the reading of the existing code, within the ceiling. Written once, here; nothing else words it.
 * @param view the story
 * @param input the plan, the analysis facts, the request, the target, the legacy code and the readings
 * @returns the text, and each reason it cannot be trusted
 */
export const contextOf = (view: StoryView, input: ContextInputs) => {
    const { plan, facts, request, target, source, readings } = input;
    const problems: string[] = [];
    const fail = (text: string) => problems.push(`story "${view.title}": ${text}`);
    const titleOf = new Map(plan.stories.map((story) => [story.key as string, story.title]));
    const layerBy = new Map(plan.layers.map((layer) => [layer.id as string, layer]));
    const decisionBy = new Map(plan.decisions.map((decision) => [decision.id as string, decision]));
    const stepBy = new Map(
        (target?.journeys ?? []).flatMap((j) => j.steps.map((step) => [step.id, { step, j }] as const)),
    );
    const plain = (text: string) =>
        text
            .replace(/\s*\([^()]*\b[a-z]+(?:-[a-z]+)*-\d{8,}\b[^()]*\)/g, "")
            .replace(ID, (id) => facts.rules.get(id)?.says.split(/(?<=\.)\s/)[0] ?? "another finding");

    // The rules it builds, then those it only relies on.
    const relied = view.reliesOn.filter((each) => !view.builds.includes(each.rule));
    const ruleIds = [...view.builds, ...relied.map((each) => each.rule)] as string[];
    const known = new Set(ruleIds);
    for (const id of ruleIds) if (!facts.rules.has(id)) fail("a rule it builds or relies on is not in the analysis");
    const topic = (decision: Plan["decisions"][number]) =>
        decision.topic._tag === "integration"
            ? LABELS.outside(decision.topic.system)
            : decision.topic._tag === "scope"
              ? LABELS.scope(decision.topic.capability)
              : decision.topic._tag === "note"
                ? LABELS.note(decision.topic.number)
                : decision.topic._tag === "area"
                  ? decision.topic.name
                  : LABELS.convention(decision.layer === "workspace" ? LABELS.everyLayer : (layerBy.get(decision.layer)?.name ?? decision.layer));

    // The criteria, in the order of the body, and the legacy code each rests on. A place shown under one criterion is
    // named by a later one that rests on the same place; a doubt is said once, under the first criterion that cites it.
    const citedDecisions: string[] = [];
    const citedLayers: string[] = [];
    const spans: Place[] = [];
    const shownAt = new Map<string, number>();
    const doubted = new Set<string>();
    type Part = string | { readonly span: number };
    const criteria = view.criteria.map((criterion, order): Part[] => {
        const parts: Part[] = [];
        for (const ref of criterion.from) {
            const miss = () => fail(`criterion ${order + 1} rests on a ${ref._tag} that does not exist`);
            if (ref._tag === "rule") {
                const fact = facts.rules.get(ref.id);
                if (!known.has(ref.id)) fail(`criterion ${order + 1} cites a rule it neither builds nor relies on`);
                else if (fact !== undefined && view.builds.includes(ref.id)) {
                    for (const place of [fact.place, ...fact.alsoRestsOn]) {
                        const earlier = shownAt.get(at(place));
                        if (earlier !== undefined) parts.push(`${at(place)} (${LABELS.sameCode} AC-${earlier})`);
                        else {
                            shownAt.set(at(place), order + 1);
                            parts.push({ span: spans.push(place) - 1 });
                        }
                    }
                    if (fact.doubt !== "" && !doubted.has(ref.id)) parts.push(`Doubt: ${plain(fact.doubt)}`);
                    doubted.add(ref.id);
                }
            } else if (ref._tag === "decision") {
                const decision = decisionBy.get(ref.id);
                if (decision === undefined) miss();
                else citedDecisions.push(ref.id);
            } else if (ref._tag === "layer") {
                if (layerBy.get(ref.id) === undefined) miss();
                else citedLayers.push(ref.id);
            } else if (ref._tag === "step") {
                if (stepBy.get(ref.id) === undefined) miss();
            } else {
                const change = facts.transitions.find((each) => each.id === ref.id);
                if (change === undefined) miss();
                else parts.push(`Change of state: ${change.entityName}: ${change.from} to ${change.to}`);
            }
        }
        return parts;
    });

    // Rules built by another story are named under that story, once.
    const reliedBlocks = [...new Set(relied.map((each) => each.builtBy))].map((key) =>
        [
            `### ${LABELS.builtBy}: ${titleOf.get(key) ?? "no story of the plan"}`,
            "",
            ...relied.flatMap((each) => {
                const fact = facts.rules.get(each.rule);
                return each.builtBy !== key || fact === undefined ? [] : [`- ${fact.says} (${at(fact.place)})`];
            }),
        ].join("\n"),
    );

    // The wording of each rule it builds, where it is decided.
    const builtLines = view.builds.flatMap((id) => {
        const fact = facts.rules.get(id);
        return fact === undefined ? [] : [`- ${fact.says} (${at(fact.place)})`];
    });

    const decisions = [...new Set(citedDecisions)].flatMap((id) => {
        const decision = decisionBy.get(id);
        return decision === undefined
            ? []
            : [[`### ${topic(decision)}`, "", `Chose: ${decision.chose}`, `Why: ${decision.reason}`].join("\n")];
    });
    const layerIds = new Set([
        ...(view.layers ?? []),
        ...citedLayers,
        ...citedDecisions.map((id) => decisionBy.get(id)?.layer ?? ""),
    ]);
    // A story no layer is named for (tooling, conventions of the workspace) concerns every layer.
    const layers = plan.layers
        .filter((layer) => layerIds.has(layer.id) || [...layerIds].every((id) => !layerBy.has(id)))
        .map((layer) =>
            [
                `### ${layer.name}`,
                "",
                `Path: ${layer.path}`,
                `Purpose: ${layer.purpose}`,
                `Check: ${layer.check}`,
                ...(layer.carries.length === 0
                    ? []
                    : [
                          `Carries: ${layer.carries
                              .map((n) => request.stack[n - 1] ?? "")
                              .filter(Boolean)
                              .join("; ")}`,
                      ]),
            ].join("\n"),
        );

    // The steps and components of the confirmed target it builds, or only their names when that is all the plan holds.
    const steps = [...new Set(view.steps ?? [])].flatMap((id) => {
        const known = stepBy.get(id);
        if (known === undefined) return [];
        const { step, j } = known;
        const kept = (step.changes ?? []).map((change) => {
            const place = facts.rules.get(change.rule)?.place;
            return `${place === undefined ? LABELS.ruleOfToday : LABELS.ruleAt(at(place))}: ${change.to}`;
        });
        return [
            [
                `### Step: ${step.intent}`,
                "",
                `Journey: ${j.name}`,
                `Against today: ${step.link._tag === "legacy" ? step.link.change : "new"}; ${step.link.reason}`,
                `The system: ${step.system}`,
                ...(kept.length === 0 ? [] : [`It changes: ${kept.join("; ")}`]),
            ].join("\n"),
        ];
    });
    const components = (view.components ?? []).map((name) => {
        const component = target?.architecture.components.find((each) => each.name === name);
        if (component === undefined || target === undefined) return `### Component: ${name}`;
        const layer = componentLayer(name, {
            layers: plan.layers,
            decisions: plan.decisions,
            target,
            externals: facts.externals,
        });
        return [
            `### Component: ${name}`,
            "",
            `Does: ${component.responsibility}`,
            `Module: ${component.module}`,
            ...(layer === undefined ? [] : [`Built in: ${layer.path}`]),
        ].join("\n");
    });

    // Every place a rule cites is in the code.
    const mine = view.builds.flatMap((id) => {
        const fact = facts.rules.get(id);
        return fact === undefined ? [] : [fact.place, ...fact.alsoRestsOn];
    });
    if (source.readable)
        for (const place of [...mine, ...relied.flatMap((each) => facts.rules.get(each.rule)?.place ?? [])])
            if (
                place.firstLine < 1 ||
                place.lastLine < place.firstLine ||
                place.lastLine > (source.lines(place.file)?.length ?? 0)
            )
                fail(`${at(place)} is not in the analysed code`);

    const blocks = spans.map((span) => {
        const lines = source.readable ? source.lines(span.file)?.slice(span.firstLine - 1, span.lastLine) : undefined;
        return !source.readable
            ? at(span)
            : `${at(span)}\n\n${lines === undefined ? LABELS.unreadPlace : fenced(lines)}`;
    });
    const section = (title: string, parts: readonly string[], intro?: string) =>
        parts.length === 0 ? [] : [`## ${title}`, ...(intro === undefined ? [] : [intro]), ...parts];
    const before = [`# ${view.title}`, storyBody(view, plan)];
    const after = [
        ...section(LABELS.rulesBuilt, builtLines),
        ...section(LABELS.rulesRelied, reliedBlocks),
        ...section(LABELS.decisions, decisions),
        ...section(LABELS.layers, layers),
        ...section(LABELS.targetParts, [...steps, ...components]),
    ];
    // The analysis's own text of each old screen the story ports, its headings lowered under the story's.
    const sections = readings.map((reading) => ({
        text: `### ${reading.title}\n\n${reading.text.replace(/^## /gm, "#### ").trimEnd()}`,
    }));
    // What each criterion rests on; the code of the places after the first `n` is left out, their places stay.
    const restsOn =
        section(
            LABELS.restsOn,
            criteria.flatMap((parts, order) =>
                parts.length === 0
                    ? []
                    : [
                          [
                              `### AC-${order + 1}`,
                              ...parts.map((part) =>
                                  typeof part === "string"
                                      ? part
                                      : blocks[part.span]!,
                              ),
                          ].join("\n\n"),
                      ],
            ),
            ...(source.readable || spans.length === 0 ? [] : [LABELS.codeUnread]),
        );
    const text = `${[
        ...before,
        ...restsOn,
        ...after,
        ...(sections.length === 0 ? [] : [`## ${LABELS.reading}`, ...sections.map((each) => each.text)]),
    ].join("\n\n")}\n`;
    for (const id of ruleIds) {
        const fact = facts.rules.get(id);
        const found =
            fact === undefined || text.includes(view.builds.includes(id as never) ? at(fact.place) : fact.says);
        if (!found) fail("a rule it builds or relies on is not in its context");
    }
    return { text, problems };
};
