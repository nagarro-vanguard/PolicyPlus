import { homedir } from "node:os";
import { compareText, distinct } from "./io";
import type { Payloads } from "./inputs/payloads";
import type { PlanInput } from "./inputs/plan";
import type { Target } from "./inputs/target";
import type { AssistantTexts } from "./build/assistant";
import type { Diagram } from "./build/diagrams";
import type { Facts } from "./build/facts";
import type { Hierarchy, Node } from "./build/hierarchy";
import type { ArchitectureView, ProposedJourney, StepTrace, TodayJourney } from "./build/journeys";
import type { Numbers } from "./build/numbers";
import type { PlanViews } from "./build/plan-views";

/*
 * Reconciliation: each check compares two independent ways of counting the same thing, or proves that nothing was
 * dropped on the way. A failing check fails compose; a check whose facts are absent (no target, no plan) is skipped
 * and says why.
 */

export type Check = {
    id: string;
    name: string;
    status: "pass" | "fail" | "skipped";
    detail: string;
    problems: string[];
};

export type ReconcileInput = {
    payloads: Payloads;
    facts: Facts;
    hierarchy: Hierarchy;
    numbers: Numbers;
    diagrams: readonly Diagram[];
    today: readonly TodayJourney[];
    target: Target | undefined;
    proposed: readonly ProposedJourney[];
    architecture: ArchitectureView | undefined;
    trace: readonly StepTrace[];
    plan: PlanInput | undefined;
    views: PlanViews | undefined;
    assistant: AssistantTexts;
    versions: string;
    skillNames: readonly string[];
    /** The input folders given, which no copy text may name. */
    roots: readonly string[];
};

const check = (id: string, name: string, problems: readonly string[], detail: string): Check => ({
    id,
    name,
    status: problems.length === 0 ? "pass" : "fail",
    detail,
    problems: problems.slice(0, 20),
});
const skipped = (id: string, name: string, why: string): Check => ({
    id,
    name,
    status: "skipped",
    detail: why,
    problems: [],
});
const differ = (what: string, one: number, other: number) =>
    one === other ? [] : [`${what}: ${one} against ${other}`];

/**
 * Run every reconciliation check.
 * @param input everything compose built
 * @returns the checks, R-01 to R-14
 */
export const reconcile = (input: ReconcileInput): Check[] => {
    const { facts, hierarchy, numbers, payloads } = input;
    const checks: Check[] = [];
    const actions = new Map(facts.actions.map((each) => [each.id, each]));

    // R-01: every entry point is in exactly one place, or the analysis reports it as unplaced.
    {
        const reported = new Set(payloads.system.unplaced.entryPoints);
        const problems = [
            ...facts.actions
                .filter((each) => each.surface === null && !reported.has(each.id))
                .map((each) => `entry point ${each.id} is in no place and the analysis does not report it`),
            ...[...reported]
                .filter((id) => actions.get(id)?.surface !== null && actions.has(id))
                .map((id) => `entry point ${id} is reported unplaced but sits in a place`),
        ];
        const placed = facts.actions.filter((each) => each.surface !== null).length;
        checks.push(
            check(
                "R-01",
                "every entry point placed once or reported",
                problems,
                `${placed} placed, ${facts.actions.length - placed} reported in no place, of ${facts.actions.length}`,
            ),
        );
    }

    // R-02: every capability is in exactly one area and every area's capabilities exist.
    {
        const inAreas = new Map<string, number>();
        for (const area of facts.areas) for (const id of area.capabilities) inAreas.set(id, (inAreas.get(id) ?? 0) + 1);
        const known = new Set(facts.capabilities.map((each) => each.id));
        const problems = [
            ...facts.capabilities
                .filter((each) => (inAreas.get(each.id) ?? 0) !== 1)
                .map((each) => `${each.name} is in ${inAreas.get(each.id) ?? 0} areas`),
            ...[...inAreas.keys()]
                .filter((id) => !known.has(id))
                .map((id) => `an area names capability ${id}, which has no payload`),
        ];
        checks.push(
            check(
                "R-02",
                "every capability reachable from one area",
                problems,
                `${facts.capabilities.length} capabilities in ${facts.areas.length} areas`,
            ),
        );
    }

    // R-03: a capability's entry points, summed over its places and its unplaced ones, equal its declared totals.
    {
        const problems = facts.capabilities.flatMap((capability) => {
            const onPlaces = capability.surfaces.reduce(
                (sum, key) => sum + capability.actions.filter((id) => actions.get(id)?.surface === key).length,
                0,
            );
            const elsewhere = capability.actions.filter((id) => actions.get(id)?.surface === null).length;
            return [
                ...differ(
                    `${capability.name}: entry points over its places and elsewhere, against the capability payload's totals`,
                    onPlaces + elsewhere,
                    capability.declared.totalsActions,
                ),
                ...differ(
                    `${capability.name}: entry points in the capability payload, against the system payload`,
                    capability.actions.length,
                    capability.declared.actions,
                ),
            ];
        });
        checks.push(
            check(
                "R-03",
                "capability totals equal the sums over their paths",
                problems,
                `${facts.capabilities.length} capabilities checked`,
            ),
        );
    }

    // R-04: every rule counted once, per capability and for the system.
    {
        const owned = facts.rules.filter((rule) => rule.capabilities.length > 0).length;
        const none = facts.rules.length - owned;
        const problems = [
            ...facts.capabilities.flatMap((capability) => [
                ...differ(
                    `${capability.name}: distinct rules against the capability payload's totals`,
                    capability.rules.length,
                    capability.declared.totalsRules,
                ),
                ...differ(
                    `${capability.name}: distinct rules against the system payload`,
                    capability.rules.length,
                    capability.declared.rules,
                ),
            ]),
            ...differ(
                "rules some capability holds plus rules in no capability, against every rule the analysis indexed",
                owned + none,
                facts.ruleIndex.length,
            ),
            ...differ(
                "rules in no capability against the count the system payload declares",
                none,
                payloads.system.rulesInNoCapability.count,
            ),
            ...differ(
                "the numbers table's system rules against the rules counted once",
                numbers.value("system/rules"),
                facts.rules.length,
            ),
        ];
        const summed = facts.capabilities.reduce((sum, each) => sum + each.rules.length, 0);
        checks.push(
            check(
                "R-04",
                "business rules counted once",
                problems,
                `${owned} rules held by capabilities (${summed} if summed over capabilities), ${none} in no capability`,
            ),
        );
    }

    // R-05: each place agrees with its entry points.
    {
        const problems = facts.surfaces.flatMap((surface) => {
            const of = surface.actions.map((id) => actions.get(id)).filter((each) => each !== undefined);
            const capabilities = distinct(of.map((each) => each.capability ?? "").filter((id) => id !== ""));
            const rules = distinct(of.flatMap((each) => each.rules)).length;
            return [
                ...differ(
                    `${surface.name}: entry points listed against declared`,
                    surface.actions.length,
                    surface.declared.actions,
                ),
                ...(capabilities.join(" ") === surface.capabilities.join(" ")
                    ? []
                    : [`${surface.name}: its capabilities differ from its entry points' capabilities`]),
                ...differ(
                    `${surface.name}: distinct rules of its entry points against declared`,
                    rules,
                    surface.declared.rules,
                ),
            ];
        });
        checks.push(
            check(
                "R-05",
                "every place agrees with its entry points",
                problems,
                `${facts.surfaces.length} places checked`,
            ),
        );
    }

    const steps = input.proposed.flatMap((journey) => journey.steps.map((step) => step.id));
    const stepSet = new Set(steps);

    // R-06: steps against stories.
    if (input.views === undefined || input.target === undefined) {
        checks.push(skipped("R-06", "every story step is a chosen step", "no target and plan given"));
    } else {
        const named = input.views.stories.flatMap((story) => story.steps.map((step) => [story.key, step] as const));
        const withStory = input.trace.filter((each) => each.stories.length > 0).length;
        const without = input.trace.filter((each) => each.stories.length === 0).length;
        const problems = [
            ...named
                .filter(([, step]) => !stepSet.has(step))
                .map(([story, step]) => `story ${story} names step ${step}, which no chosen journey holds`),
            ...differ(
                "steps with a story plus steps without, against the chosen steps",
                withStory + without,
                steps.length,
            ),
        ];
        checks.push(
            check(
                "R-06",
                "every story step is a chosen step",
                problems,
                `${steps.length} chosen steps: ${withStory} with a story, ${without} without`,
            ),
        );
    }

    // R-07: each built rule has exactly one building story; built and dropped cover the rules capabilities hold.
    if (input.views === undefined) {
        checks.push(skipped("R-07", "every rule built once", "no plan given"));
    } else {
        const builders = new Map<string, string[]>();
        for (const story of input.views.stories)
            for (const rule of story.builds) builders.set(rule, [...(builders.get(rule) ?? []), story.key]);
        const dropped = new Set(input.proposed.flatMap((journey) => journey.dropped));
        const owned = facts.rules.filter((rule) => rule.capabilities.length > 0).map((rule) => rule.id);
        const problems = [
            ...[...builders]
                .filter(([, keys]) => keys.length > 1)
                .map(([rule, keys]) => `rule ${rule} is built by ${keys.length} stories`),
            ...owned
                .filter((rule) => !builders.has(rule) && !dropped.has(rule))
                .map((rule) => `rule ${rule} is neither built nor dropped`),
            ...differ("rules built against the plan's coverage", builders.size, input.views.coverage.rulesBuilt),
        ];
        checks.push(
            check(
                "R-07",
                "every rule built once",
                problems,
                `${builders.size} rules built, ${dropped.size} dropped by design, ${owned.length} held by capabilities`,
            ),
        );
    }

    // R-08: the journey by domain matrix adds up.
    const matrix = input.views?.matrix ?? null;
    if (matrix === null) {
        checks.push(skipped("R-08", "the journey by domain matrix adds up", "no target and plan given"));
    } else {
        const problems = [
            ...matrix.journeys.flatMap((journey) =>
                differ(
                    `steps of ${journey} across the domains against its steps`,
                    matrix.cells
                        .filter((cell) => cell.journey === journey)
                        .reduce((sum, cell) => sum + cell.steps.length, 0),
                    input.proposed.find((each) => each.id === journey)?.steps.length ?? -1,
                ),
            ),
            ...matrix.domains.flatMap((domain) =>
                differ(
                    `steps of domain "${domain}" against its column total`,
                    matrix.cells
                        .filter((cell) => cell.domain === domain)
                        .reduce((sum, cell) => sum + cell.steps.length, 0),
                    matrix.columnTotals[domain] ?? 0,
                ),
            ),
            ...differ(
                "cells against the chosen steps",
                matrix.cells.reduce((sum, cell) => sum + cell.steps.length, 0),
                steps.length,
            ),
        ];
        checks.push(
            check(
                "R-08",
                "the journey by domain matrix adds up",
                problems,
                `${matrix.journeys.length} journeys by ${matrix.domains.length} domains, ${matrix.total} steps`,
            ),
        );
    }

    // R-09: edges between domains equal the component uses that cross domains, counted from the target as written.
    if (input.target === undefined || input.architecture === undefined) {
        checks.push(skipped("R-09", "domain edges equal cross-domain uses", "no target given"));
    } else {
        const written = input.target.architecture.components ?? [];
        const domainOf = new Map(written.map((each) => [each.name, each.domain]));
        const crossing = written.reduce(
            (sum, each) => sum + distinct(each.uses).filter((used) => domainOf.get(used) !== each.domain).length,
            0,
        );
        const drawn =
            input.diagrams
                .find((each) => each.key === "organisation/target")
                ?.edges.reduce((sum, edge) => sum + edge.count, 0) ?? 0;
        checks.push(
            check(
                "R-09",
                "domain edges equal cross-domain uses",
                differ("uses drawn between domains against uses that cross domains", drawn, crossing),
                `${crossing} uses cross domains`,
            ),
        );
    }

    // R-10: exactly one chosen way per journey, each resolving to a journey the target holds.
    if (input.target === undefined) {
        checks.push(skipped("R-10", "one chosen way per journey", "no target given"));
    } else {
        const picks = new Map<string, number>();
        for (const pick of input.target.picks) picks.set(pick.of, (picks.get(pick.of) ?? 0) + 1);
        const tasks = input.today.map((each) => each.id);
        const problems = [
            ...[...picks].filter(([, count]) => count !== 1).map(([task, count]) => `${task} has ${count} chosen ways`),
            ...tasks.filter((task) => !picks.has(task)).map((task) => `${task} has no chosen way`),
            ...[...picks.keys()]
                .filter((task) => !tasks.includes(task))
                .map((task) => `a way is chosen for ${task}, which is no journey of today`),
            ...differ(
                "chosen ways that resolve to a journey of the target, against picks",
                input.proposed.length,
                input.target.picks.length,
            ),
        ];
        checks.push(
            check(
                "R-10",
                "one chosen way per journey",
                problems,
                `${input.proposed.length} chosen ways for ${tasks.length} journeys`,
            ),
        );
    }

    // R-11: every story's tag set names a workflow.
    if (input.views === undefined) {
        checks.push(skipped("R-11", "every tag set resolves to a workflow", "no plan given"));
    } else {
        const problems = input.views.stories
            .filter((story) => story.work === null)
            .map((story) => `story ${story.key} carries tags ${story.tags.join(", ")}, which name no workflow`);
        checks.push(
            check("R-11", "every tag set resolves to a workflow", problems, `${input.views.stories.length} stories`),
        );
    }

    // R-12: the hierarchy holds together and every number it shows exists with a scope and a source.
    {
        const nodes = hierarchy.nodes;
        const seen = new Set<string>();
        const todo = ["overview"];
        const out = (node: Node) => [
            ...node.children.rows.map((row) => row.node),
            ...node.folds.flatMap((fold) => fold.rows.map((row) => row.node)),
            ...node.lateral.map((link) => link.node),
        ];
        while (todo.length > 0) {
            const key = todo.pop() as string;
            if (seen.has(key)) continue;
            const node = nodes.get(key);
            if (node === undefined) continue;
            seen.add(key);
            for (const next of out(node)) if (next !== undefined && !seen.has(next)) todo.push(next);
        }
        const referenced = [...nodes.values()]
            .flatMap((node) => [
                ...node.facts,
                ...node.children.rows.map((row) => row.count),
                ...node.folds.flatMap((fold) => fold.rows.map((row) => row.count)),
                ...node.lateral.map((link) => link.count),
            ])
            .filter((key): key is string => key !== undefined);
        const problems = [
            ...[...nodes.keys()]
                .filter((key) => !seen.has(key))
                .map((key) => `${key} cannot be reached from the overview`),
            ...[...nodes.values()].flatMap((node) =>
                [...out(node), node.up, ...node.crumbs]
                    .filter((key): key is string => key !== undefined && key !== null && !nodes.has(key))
                    .map((key) => `${node.key} points at ${key}, which is no node`),
            ),
            ...distinct(referenced)
                .filter((key) => !numbers.has(key))
                .map((key) => `number ${key} is shown but not in the numbers table`),
            ...numbers
                .all()
                .filter((entry) => entry.scope === "" || entry.source === "")
                .map((entry) => `number ${entry.key} has no scope or source`),
            ...numbers
                .all()
                .filter(
                    (entry) =>
                        entry.parts !== undefined &&
                        entry.parts.reduce((sum, part) => sum + part.value, 0) !== entry.value,
                )
                .map((entry) => `number ${entry.key}: its kinds do not add up`),
            ...[...nodes.values()]
                .filter((node) => node.facts.length > 3)
                .map((node) => `${node.key} shows more than three facts`),
        ];
        checks.push(
            check(
                "R-12",
                "every node reachable and every number defined",
                problems,
                `${nodes.size} nodes, ${numbers.all().length} numbers`,
            ),
        );
    }

    // R-13: diagram edges end on nodes and each edge has its line of text.
    {
        const problems = input.diagrams.flatMap((diagram) => {
            const ids = new Set(diagram.nodes.map((node) => node.id));
            return [
                ...diagram.edges
                    .filter((edge) => !ids.has(edge.from) || !ids.has(edge.to))
                    .map((edge) => `${diagram.key}: an edge from ${edge.from} to ${edge.to} ends on no node`),
                ...differ(`${diagram.key}: lines of text against edges`, diagram.text.length, diagram.edges.length),
                ...diagram.edges
                    .filter((edge) => !diagram.legend.some((entry) => entry.kind === edge.kind))
                    .map((edge) => `${diagram.key}: edge kind ${edge.kind} is not in the legend`),
            ];
        });
        checks.push(
            check(
                "R-13",
                "diagram edges end on nodes and have their text",
                problems,
                `${input.diagrams.length} diagrams`,
            ),
        );
    }

    // R-14: the inputs' versions are known (checked on reading); no copy text holds this machine's home folder or an
    // input folder; a rule's text holds no skill name and no other rule beyond its own review note.
    {
        const local = [homedir(), ...input.roots].filter((folder) => folder.length > 1);
        const problems: string[] = [];
        for (const [kind, byKey] of Object.entries(input.assistant.texts)) {
            for (const [key, text] of Object.entries(byKey)) {
                if (local.some((folder) => text.includes(folder)))
                    problems.push(`the ${kind} text ${key} holds an absolute path of this machine`);
            }
        }
        const ruleIds = new Set(facts.rules.map((rule) => rule.id));
        for (const [key, text] of Object.entries(input.assistant.texts.rule ?? {})) {
            for (const skill of input.skillNames)
                if (new RegExp(`\\b${skill.replace(/[-]/g, "\\-")}\\b`).test(text))
                    problems.push(`the rule text ${key} names ${skill}`);
            // The rule's own review note may name a related rule; anything else naming another rule is out of scope.
            const outside = text
                .split("\n")
                .filter((line) => !line.startsWith("Reading: "))
                .join("\n");
            const others = distinct(outside.match(/\b[a-z]+-\d{8,}\b/g) ?? []).filter((id) => ruleIds.has(id));
            if (others.length > 1) problems.push(`the rule text ${key} names ${others.length} rules`);
        }
        checks.push(
            check(
                "R-14",
                "known input versions and copy texts within their scope",
                problems.sort(compareText),
                input.versions,
            ),
        );
    }
    return checks;
};
