import type { Analysis } from "../read/analysis";
import type { ModernizationRequest } from "../model/request";
import type { Decision, Story, TargetLayer } from "../model/records";
import type { Plan } from "../model/plan";
import { AGENTS_MD_MAX_LINES, countedLines, layerAgentsMd } from "./agents-md";
import { SHARED, type Facts } from "./facts";
import type { Target } from "../read/target";
import { targetGaps } from "./target-gates";

export type Gaps = { readonly failing: string[]; readonly advisory: string[] };

type Input = {
    readonly analysis: Analysis;
    readonly facts: Facts;
    readonly request: ModernizationRequest;
    readonly layers: readonly TargetLayer[];
    readonly decisions: readonly Decision[];
    readonly stories: readonly Story[];
    readonly plan: Plan;
    readonly problems: readonly string[];
    /** The confirmed target, when the plan is made from one. */
    readonly target?: Target | undefined;
};

const some = (items: readonly string[], limit = 3) =>
    items.length <= limit ? items.join("; ") : `${items.slice(0, limit).join("; ")}; and ${items.length - limit} more`;
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const short = (text: string) => (text.length > 70 ? `${text.slice(0, 67)}...` : text);

// The sentence pattern of an acceptance criterion; the story sheet of the app splits `says` with the same pattern.
const givenWhenThen = /^\s*given\s+[\s\S]+?,\s+when\s+[\s\S]+?,\s+then\s+[\s\S]+?\s*$/iu;

type Reader = Pick<Story, "title" | "what" | "why" | "open"> & {
    terms?: readonly { name: string; means: string }[];
    journey?: { name: string; steps: readonly string[] } | undefined;
    criteria: readonly { says: string; from: readonly { _tag: string }[] }[];
};

/**
 * What is wrong with a story's text: a title over 72 characters or ending in an ellipsis, doubled punctuation, a
 * criterion without a given, a when or a then, one over 60 words (90 when it cites several rules) or
 * with nothing it rests on, and any text that holds an id the plan knows.
 * @param story the story
 * @param known the ids the plan or the job knows: rules, steps, decisions, layers, changes of state, stories
 * @returns each problem, saying where
 */
export const storyProblems = (story: Reader, known: ReadonlySet<string> = new Set()) => {
    const found: string[] = [];
    if (story.title.length > 72) found.push(`the title is ${story.title.length} characters, over 72`);
    if (/(\.\.\.|\u2026)\s*$/.test(story.title)) found.push("the title ends in an ellipsis");
    if (story.criteria.length === 0) found.push("it has no criterion");
    const texts = [
        ["title", story.title],
        ["what", story.what],
        ["why", story.why],
    ] as [string, string][];
    story.criteria.forEach((c, at) => texts.push([`criterion ${at + 1}`, c.says]));
    (story.open ?? []).forEach((text, at) => texts.push([`open point ${at + 1}`, text]));
    (story.terms ?? []).forEach((term, at) => texts.push([`term ${at + 1}`, `${term.name} ${term.means}`]));
    (story.journey?.steps ?? []).forEach((step, at) => texts.push([`journey step ${at + 1}`, step]));
    for (const [where, text] of texts) {
        if (/(?<!\.)\.\.(?!\.)|,\.|,,/.test(text)) found.push(`the ${where} has doubled punctuation`);
        const id = [...known].find((each) => each !== "" && text.includes(each));
        if (id !== undefined) found.push(`the ${where} holds the id ${id}: say it in words`);
    }
    story.criteria.forEach((c, at) => {
        const n = words(c.says);
        const limit = c.from.filter((ref) => ref._tag === "rule").length > 1 ? 90 : 60;
        if (n > limit) found.push(`criterion ${at + 1} is ${n} words, over ${limit}`);
        if (!givenWhenThen.test(c.says)) found.push(`criterion ${at + 1} lacks a given, a when or a then`);
        if (c.from.length === 0)
            found.push(`criterion ${at + 1} rests on nothing: cite a rule, decision, step or layer`);
    });
    return found;
};

/**
 * The stories that say the same thing in `what`, which a reader cannot tell apart.
 * @param stories the stories of a job, or of the plan
 * @returns one problem per shared sentence
 */
export const sameWhat = (stories: readonly { title: string; what: string }[]) => {
    const by = new Map<string, string[]>();
    for (const story of stories) by.set(story.what.trim(), [...(by.get(story.what.trim()) ?? []), story.title]);
    return [...by.values()]
        .filter((titles) => titles.length > 1)
        .map((titles) => `${titles.length} stories say the same in what: ${some(titles)}`);
};

/**
 * Every invariant the plan must hold, as pure checks. Failing gaps stop the plan; advisory ones are reported only.
 * @param input the records, the facts, the request and the derived plan
 * @returns what is wrong
 */
export const checkPlan = (input: Input): Gaps => {
    const { analysis, facts, request, layers, decisions, stories, plan } = input;
    const failing: string[] = [...input.problems];
    const advisory: string[] = [];

    // Decisions: scope, integrations, notes, layers.
    const scoped = new Set(decisions.flatMap((d) => (d.topic._tag === "scope" ? [d.topic.capability] : [])));
    const unscoped = analysis.capabilities.map((c) => c.capability.name).filter((name) => !scoped.has(name));
    if (unscoped.length > 0 && input.target === undefined)
        failing.push(`no scope decision (carry, replace or drop) for: ${some(unscoped)}`);
    const integrated = new Set(decisions.flatMap((d) => (d.topic._tag === "integration" ? [d.topic.system] : [])));
    const missingSystems = analysis.system.externals.map((e) => e.name).filter((name) => !integrated.has(name));
    if (missingSystems.length > 0)
        failing.push(`no integration decision for the outside systems: ${some(missingSystems)}`);
    const noted = new Set(decisions.flatMap((d) => (d.topic._tag === "note" ? [d.topic.number] : [])));
    request.notes.forEach((note, at) => {
        if (!noted.has(at + 1)) failing.push(`note ${at + 1} has no decision: "${short(note)}"`);
    });
    const layerIds = new Set(layers.map((layer) => layer.id as string));
    for (const decision of decisions) {
        if (decision.layer !== "workspace" && !layerIds.has(decision.layer))
            failing.push(`a decision names a layer that does not exist: "${short(decision.chose)}"`);
        if (decision.topic._tag === "convention" && /\n/.test(decision.chose))
            failing.push(`a convention must be one line: "${short(decision.chose)}"`);
    }
    const names = layers.map((layer) => layer.name);
    if (new Set(names).size !== names.length) failing.push("two layers have the same name");
    const carried = new Set(layers.flatMap((layer) => layer.carries));
    request.stack.forEach((line, at) => {
        if (!carried.has(at + 1)) failing.push(`no layer carries target stack line ${at + 1}: "${short(line)}"`);
    });
    for (const layer of layers)
        for (const dep of layer.dependsOn)
            if (!layerIds.has(dep)) failing.push(`layer ${layer.name} depends on a layer that does not exist`);
    const visiting = new Set<string>();
    const done = new Set<string>();
    const cyclic = (id: string): boolean => {
        if (done.has(id)) return false;
        if (visiting.has(id)) return true;
        visiting.add(id);
        const layer = layers.find((each) => each.id === id);
        const loops = (layer?.dependsOn ?? []).some((dep) => cyclic(dep));
        visiting.delete(id);
        done.add(id);
        return loops;
    };
    if (layers.some((layer) => cyclic(layer.id))) failing.push("the layers depend on each other in a cycle");
    for (const layer of layers) {
        const lines = countedLines(layerAgentsMd(layer, request, decisions));
        if (lines > AGENTS_MD_MAX_LINES)
            failing.push(`the AGENTS.md of layer ${layer.name} is ${lines} lines, over ${AGENTS_MD_MAX_LINES}`);
    }

    if (input.target !== undefined) {
        const found = targetGaps({
            plan,
            facts,
            target: input.target,
            layers,
            request,
            decisions,
            bundle: analysis.bundle,
        });
        failing.push(...found.failing);
        advisory.push(...found.advisory);
    } else {
        // Coverage: actions, rules, transitions.
        const actionStories = new Map<string, number>();
        const surfaceOfAction = new Map(
            facts.capabilities.flatMap((c) => c.surfaces.flatMap((s) => s.actions.map((a) => [a.id, s.key] as const))),
        );
        for (const story of stories) {
            for (const id of story.actions) actionStories.set(id, (actionStories.get(id) ?? 0) + 1);
            const unknown = story.actions.filter((id) => !surfaceOfAction.has(id));
            if (unknown.length > 0)
                failing.push(`story "${short(story.title)}" names ${unknown.length} actions the plan does not carry`);
            if (new Set(story.actions.map((id) => surfaceOfAction.get(id))).size > 1)
                failing.push(`story "${short(story.title)}" spans more than one surface`);
        }
        const unplannedActions = [...surfaceOfAction.keys()].filter((id) => (actionStories.get(id) ?? 0) === 0);
        if (unplannedActions.length > 0) failing.push(`${unplannedActions.length} actions are in no story`);
        const twice = [...actionStories.entries()].filter(([, n]) => n > 1);
        if (twice.length > 0) failing.push(`${twice.length} actions are in more than one story`);

        const ownerSurface = new Map(
            facts.capabilities.flatMap((c) => c.surfaces.flatMap((s) => s.owned.map((rule) => [rule, s.key] as const))),
        );
        const sharedRules = new Set(facts.shared);
        const built = new Set<string>();
        for (const view of plan.stories) {
            for (const rule of view.builds) {
                built.add(rule);
                if (!facts.rules.has(rule)) {
                    failing.push(`story "${short(view.title)}" cites a rule the plan does not carry`);
                } else if (
                    view.kind === "functional" &&
                    (ownerSurface.get(rule) ?? "").split("/")[0] !==
                        facts.capabilities.find((c) => c.name === view.capability)?.id
                ) {
                    failing.push(
                        `story "${short(view.title)}" builds a rule that belongs to ${sharedRules.has(rule) ? SHARED : "another surface"}: "${short(facts.rules.get(rule)?.says ?? "")}"`,
                    );
                } else if (view.kind === "technical" && !sharedRules.has(rule)) {
                    failing.push(`technical story "${short(view.title)}" builds a rule only one capability reaches`);
                }
            }
        }
        const unbuilt = [...facts.rules.values()].filter((rule) => !built.has(rule.id));
        if (unbuilt.length > 0)
            failing.push(
                `${unbuilt.length} rules are built by no story, for example "${short(unbuilt[0]?.says ?? "")}"`,
            );
        const citedTransitions = new Set(
            stories.flatMap((s) =>
                s.criteria.flatMap((c) => c.from.flatMap((r) => (r._tag === "transition" ? [r.id as string] : []))),
            ),
        );
        const missingTransitions = facts.transitions.filter((t) => !citedTransitions.has(t.id));
        if (missingTransitions.length > 0)
            failing.push(
                `${missingTransitions.length} changes of state are cited by no criterion, for example ${missingTransitions[0]?.entityName} to "${missingTransitions[0]?.to}"`,
            );
    }

    // The ids the plan knows, which no reader's text may hold.
    const known = new Set<string>([
        ...facts.rules.keys(),
        ...facts.capabilities.flatMap((c) => c.surfaces.flatMap((s) => s.actions.map((a) => a.id))),
        ...facts.transitions.map((t) => t.id),
        ...layers.map((layer) => layer.id),
        ...decisions.map((decision) => decision.id),
        ...(input.target?.journeys.flatMap((journey) => journey.steps.map((step) => step.id)) ?? []),
        ...plan.stories.map((view) => view.key),
    ]);
    for (const view of plan.stories)
        for (const problem of storyProblems(view, known)) failing.push(`story "${short(view.title)}": ${problem}`);
    failing.push(...sameWhat(plan.stories));

    // Advisory: every kind of data a carried capability touches has a term, once.
    const termOwners = new Map<string, number>();
    for (const story of stories)
        for (const term of story.terms)
            termOwners.set(term.entity ?? term.name, (termOwners.get(term.entity ?? term.name) ?? 0) + 1);
    const entities = facts.capabilities.flatMap((c) => c.data);
    const noTerm = [...new Map(entities.map((e) => [e.id, e.name])).entries()].filter(
        ([id, name]) => !termOwners.has(id) && !termOwners.has(name),
    );
    if (noTerm.length > 0)
        advisory.push(`${noTerm.length} kinds of data have no term: ${some(noTerm.map(([, name]) => name))}`);
    const repeated = [...termOwners.entries()].filter(([, n]) => n > 1);
    if (repeated.length > 0) advisory.push(`${repeated.length} terms are introduced by more than one story`);
    return { failing: [...new Set(failing)], advisory };
};
