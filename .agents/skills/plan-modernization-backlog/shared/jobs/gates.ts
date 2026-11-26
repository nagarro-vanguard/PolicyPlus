import { Schema } from "effect";
import { Decision, Story, TargetLayer } from "../model/records";
import { sameWhat, storyProblems } from "../derive/gates";
import { changedRuleProblems } from "../derive/consistency";
import type { Kind } from "./state";

/** What a job hands the gate: its own inputs and the records accepted before it. */
export type JobFile = {
    kind: Kind;
    stack?: string[];
    externals?: string[];
    capabilities?: string[];
    /** For the goals job: the request's goals, numbered from 1 by their order. */
    goals?: string[];
    areas?: string[];
    transitions?: string[];
    techs?: string[];
    steps?: string[];
    stepActions?: Record<string, string[]>;
    components?: string[];
    cite?: string[];
    componentRules?: Record<string, string[]>;
    /** For shared components: the unit of each (its kind, then the journeys that rely on it). */
    units?: Record<string, string>;
    layerIds?: string[];
    /** How many goals the request has, so a criterion that cites `goal n` can be checked. */
    goalCount?: number;
    decisionIds?: string[];
    areaDecisionIds?: string[];
    /** The decisions made for the goals of the request, each of which a foundation story must carry (a criterion cites it or its goal). */
    goalDecisionIds?: Record<string, number>;
    /** The rules of this job that a journey step changes, with the step and what the rule does now. */
    ruleChanges?: Record<string, { step: string; to: string }[]>;
    /** For the foundation stories: the outside systems a component of the architecture adapts, built by its story. */
    adapted?: string[];
    /** The integration decisions about those systems, filled in when the job is handed out. */
    adaptedDecisionIds?: string[];
    /** For the layers: the names of the parts of the chosen architecture. */
    containers?: string[];
};

const short = (text: string) => (text.length > 60 ? `${text.slice(0, 57)}...` : text);
const decodeWith = <A, I>(schema: Schema.Codec<A, I>, value: unknown) => {
    try {
        return { ok: true as const, value: Schema.decodeUnknownSync(schema)(value) as A };
    } catch (error) {
        return { ok: false as const, problem: String(error).split("\n").slice(0, 3).join(" ") };
    }
};

export type Output = { layers?: unknown; decisions?: unknown; stories?: unknown };

/**
 * The gate of a job's output: shape, then references, then the coverage this job owes. It never judges wording beyond
 * the reader-text rule; a reviewer reads the meaning.
 * @returns every gap; empty when the output may be reviewed
 */
export const gateJob = (job: JobFile, output: Output, request: { stack: readonly string[] }): string[] => {
    const gaps: string[] = [];
    if (job.kind === "layers") {
        const parsed = decodeWith(Schema.Array(TargetLayer), output.layers);
        if (!parsed.ok) return [`layers do not match their shape: ${parsed.problem}`];
        const layers = parsed.value;
        const ids = new Set(layers.map((layer) => layer.id as string));
        if (ids.size !== layers.length) gaps.push("two layers share an id");
        if (new Set(layers.map((layer) => layer.name)).size !== layers.length) gaps.push("two layers share a name");
        if (new Set(layers.map((layer) => layer.path)).size !== layers.length) gaps.push("two layers share a folder");
        const carried = new Set(layers.flatMap((layer) => layer.carries));
        request.stack.forEach((line, at) => {
            if (!carried.has(at + 1)) gaps.push(`no layer carries stack line ${at + 1}: "${short(line)}"`);
        });
        for (const layer of layers) {
            if (layer.path.startsWith("/") || layer.path.includes(".."))
                gaps.push(`layer ${layer.name} has a path outside the codebase`);
            for (const dep of layer.dependsOn)
                if (!ids.has(dep)) gaps.push(`layer ${layer.name} depends on an unknown layer`);
            for (const n of layer.carries)
                if (n < 1 || n > request.stack.length)
                    gaps.push(`layer ${layer.name} carries stack line ${n}, which does not exist`);
        }
        for (const tech of job.techs ?? []) {
            const lines = request.stack.flatMap((line, at) =>
                line.toLowerCase().includes(tech.trim().toLowerCase()) ? [at + 1] : [],
            );
            if (lines.length === 0 || !lines.some((n) => carried.has(n)))
                gaps.push(`no layer carries what the architecture builds with: "${short(tech)}"`);
        }
        const known = new Set(job.containers ?? []);
        for (const layer of layers)
            if (layer.container !== undefined && job.containers !== undefined && !known.has(layer.container))
                gaps.push(
                    `layer ${layer.name} builds a part the architecture does not have: ${short(layer.container)}`,
                );
        const placed = layers.flatMap((layer) =>
            layer.role === undefined || layer.container === undefined ? [] : [`${layer.role} of ${layer.container}`],
        );
        for (const twice of new Set(placed.filter((each, at) => placed.indexOf(each) !== at)))
            gaps.push(`two layers are the ${twice}: a component would not know which to go in`);
        const state = new Map<string, number>();
        const loops = (id: string): boolean => {
            if (state.get(id) === 2) return false;
            if (state.get(id) === 1) return true;
            state.set(id, 1);
            const bad = (layers.find((layer) => layer.id === id)?.dependsOn ?? []).some((dep) => loops(dep));
            state.set(id, 2);
            return bad;
        };
        if (layers.some((layer) => loops(layer.id))) gaps.push("the layers depend on each other in a cycle");
        return gaps;
    }
    if (job.kind === "integrations" || job.kind === "scope" || job.kind === "goals" || job.kind === "base") {
        const parsed = decodeWith(Schema.Array(Decision), output.decisions);
        if (!parsed.ok) return [`decisions do not match their shape: ${parsed.problem}`];
        const decisions = parsed.value;
        const ids = decisions.map((d) => d.id as string);
        if (new Set(ids).size !== ids.length) gaps.push("two decisions share an id");
        const layers = new Set(job.layerIds ?? []);
        for (const d of decisions) {
            if (d.layer !== "workspace" && !layers.has(d.layer))
                gaps.push(`a decision names an unknown layer: "${short(d.chose)}"`);
            if (d.topic._tag === "convention" && /\n/.test(d.chose))
                gaps.push(`a convention must be one line: "${short(d.chose)}"`);
        }
        const want = (label: string, wanted: readonly string[], have: readonly string[]) => {
            for (const item of wanted) if (!have.includes(item)) gaps.push(`no ${label} decision for ${short(item)}`);
            for (const item of have)
                if (!wanted.includes(item)) gaps.push(`a ${label} decision names something not asked: ${short(item)}`);
        };
        if (job.kind === "integrations") {
            want(
                "integration",
                job.externals ?? [],
                decisions.flatMap((d) => (d.topic._tag === "integration" ? [d.topic.system] : [])),
            );
        } else if (job.kind === "scope") {
            want(
                "scope",
                job.capabilities ?? [],
                decisions.flatMap((d) => (d.topic._tag === "scope" ? [d.topic.capability] : [])),
            );
            for (const d of decisions)
                if (d.topic._tag === "scope" && !/^(carry|replace|drop)\b/i.test(d.chose.trim()))
                    gaps.push(`a scope decision must start with carry, replace or drop: "${short(d.chose)}"`);
        } else if (job.kind === "goals") {
            want(
                "goal",
                (job.goals ?? []).map((_, at) => String(at + 1)),
                decisions.flatMap((d) => (d.topic._tag === "goal" ? [String(d.topic.number)] : [])),
            );
        } else {
            if (!decisions.some((d) => d.topic._tag === "area"))
                gaps.push("no area decision (libraries, tooling, testing, knowledge in code ...)");
            for (const d of decisions)
                if (d.topic._tag !== "area" && d.topic._tag !== "convention")
                    gaps.push(`a base decision must be an area or a convention: "${short(d.chose)}"`);
        }
        return gaps;
    }
    const parsed = decodeWith(Schema.Array(Story), output.stories);
    if (!parsed.ok) return [`stories do not match their shape: ${parsed.problem}`];
    const stories = parsed.value;
    // The ids this job knows, which no reader's text may hold.
    const known = new Set<string>([
        ...(job.cite ?? []),
        ...(job.transitions ?? []),
        ...(job.steps ?? []),
        ...(job.layerIds ?? []),
        ...(job.decisionIds ?? []),
        ...Object.keys(job.stepActions ?? {}),
    ]);
    if (job.kind === "journey" || job.kind === "components") return targetStoryGaps(job, stories, known);
    // The foundation stories: technical stories that rest on decisions, and the one that sets up every layer.
    const decisions = new Set(job.decisionIds ?? []);
    const citedDecisions = new Set<string>();
    const citedLayers = new Set<string>();
    const citedGoals = new Set<number>();
    for (const story of stories) {
        const label = `story "${short(story.title)}"`;
        for (const criterion of story.criteria) {
            for (const ref of criterion.from) {
                if (ref._tag === "rule" || ref._tag === "transition" || ref._tag === "step")
                    gaps.push(`${label} cites a ${ref._tag}; foundation stories rest on decisions, layers and goals`);
                else if (ref._tag === "goal") {
                    if (ref.number < 1 || ref.number > (job.goalCount ?? 0))
                        gaps.push(`${label} cites a goal that does not exist`);
                    citedGoals.add(ref.number);
                } else if (ref._tag === "layer") citedLayers.add(ref.id);
                else if (ref._tag === "decision") {
                    if (!decisions.has(ref.id)) gaps.push(`${label} cites a decision that does not exist`);
                    if ((job.adaptedDecisionIds ?? []).includes(ref.id))
                        gaps.push(
                            `${label} builds how an outside system is reached, which the story of the component that adapts it builds`,
                        );
                    citedDecisions.add(ref.id);
                }
            }
        }
        for (const problem of storyProblems(story, known)) gaps.push(`${label}: ${problem}`);
        if (story.actions.length > 0 || (story.steps ?? []).length > 0)
            gaps.push(`${label} has entry points or steps; this job writes technical stories`);
    }
    const unset = (job.layerIds ?? []).filter((id) => !citedLayers.has(id));
    if (unset.length > 0)
        gaps.push(`${unset.length} layers are set up by no story: one story sets up every layer, a criterion each`);
    const missing = (job.areaDecisionIds ?? []).filter((id) => !citedDecisions.has(id));
    if (missing.length > 0) gaps.push(`${missing.length} area decisions are cited by no story`);
    const uncarried = Object.entries(job.goalDecisionIds ?? {}).filter(
        ([id, number]) => !citedDecisions.has(id) && !citedGoals.has(number),
    );
    if (uncarried.length > 0)
        gaps.push(
            `${uncarried.length} goals are carried by no foundation story: goal ${uncarried.map(([, number]) => number).join(", goal ")}; a story that sets up how a goal is checked cites its decision or \`goal n\``,
        );
    return [...new Set([...gaps, ...sameWhat(stories)])];
};

const exactly = (label: string, wanted: readonly string[], lists: readonly (readonly string[])[], gaps: string[]) => {
    const seen = new Map<string, number>();
    for (const list of lists) for (const id of list) seen.set(id, (seen.get(id) ?? 0) + 1);
    const lost = wanted.filter((id) => !seen.has(id));
    if (lost.length > 0) gaps.push(`${lost.length} ${label} are in no story: ${lost.slice(0, 4).join(", ")}`);
    const own = new Set(wanted);
    for (const [id, count] of seen) {
        if (!own.has(id)) gaps.push(`${label.replace(/s$/, "")} ${id} is not this job's to place`);
        else if (count > 1) gaps.push(`${label.replace(/s$/, "")} ${id} is in ${count} stories, not one`);
    }
};

/**
 * The gate of a job that writes the stories of a confirmed target: its steps and components are split exactly among the
 * stories, a story's entry points are those of its steps, and it cites the rules of the components it builds, each once.
 */
const targetStoryGaps = (job: JobFile, stories: readonly Story[], known: ReadonlySet<string>): string[] => {
    const gaps: string[] = [];
    const journey = job.kind === "journey";
    exactly(
        "steps",
        job.steps ?? [],
        stories.map((story) => story.steps ?? []),
        gaps,
    );
    exactly(
        "components",
        job.components ?? [],
        stories.map((story) => story.components ?? []),
        gaps,
    );
    const cited = new Set<string>();
    const decisions = new Set(job.decisionIds ?? []);
    for (const story of stories) {
        const label = `story "${short(story.title)}"`;
        const wanted = new Set((story.steps ?? []).flatMap((id) => job.stepActions?.[id] ?? []));
        const have = new Set<string>(story.actions);
        if ([...wanted].some((id) => !have.has(id)) || [...have].some((id) => !wanted.has(id)))
            gaps.push(`${label}: its entry points must be exactly those of its steps`);
        if (!journey && (story.actions.length > 0 || (story.steps ?? []).length > 0))
            gaps.push(`${label} is a technical story of shared components: no steps and no entry points`);
        if (journey && (story.steps ?? []).length === 0) gaps.push(`${label} names no step of the journey`);
        if (new Set((story.components ?? []).map((name) => (job.units?.[name] ?? "").split(":")[0])).size > 1)
            gaps.push(
                `${label} joins components of different kinds: a rules story, a data story and a flow story are separate`,
            );
        const enforced = new Set((story.components ?? []).flatMap((name) => job.componentRules?.[name] ?? []));
        const rules = story.criteria.flatMap((criterion) =>
            criterion.from.flatMap((ref) => (ref._tag === "rule" ? [ref.id as string] : [])),
        );
        // A rule may back several criteria of the story that builds it; two stories may not both cite it.
        const mine = new Set<string>();
        for (const id of rules) {
            if (!enforced.has(id)) gaps.push(`${label} cites a rule of a component it does not build`);
            if (cited.has(id) && !mine.has(id)) gaps.push("a rule is cited by two stories of this job");
            cited.add(id);
            mine.add(id);
        }
        for (const criterion of story.criteria)
            for (const ref of criterion.from) {
                if (ref._tag === "decision" && !decisions.has(ref.id))
                    gaps.push(`${label} cites a decision that does not exist`);
                if (ref._tag === "goal" && (ref.number < 1 || ref.number > (job.goalCount ?? 0)))
                    gaps.push(`${label} cites a goal that does not exist`);
            }
        const missing = [...enforced].filter((id) => !rules.includes(id));
        if (missing.length > 0)
            gaps.push(`${label} builds components whose ${missing.length} rules no criterion cites`);
        for (const problem of storyProblems(story, known)) gaps.push(`${label}: ${problem}`);
        const changes = new Map(Object.entries(job.ruleChanges ?? {}));
        for (const problem of changedRuleProblems(story.criteria, changes)) gaps.push(`${label}: ${problem}`);
        const knownSteps = new Set([...(job.steps ?? []), ...[...changes.values()].flat().map((each) => each.step)]);
        for (const criterion of story.criteria)
            for (const ref of criterion.from)
                if (ref._tag === "step" && !knownSteps.has(ref.id))
                    gaps.push(`${label} cites a step that is not this job's and changes none of its rules`);
    }
    exactly("rules", job.cite ?? [], [[...cited]], gaps);
    return [...new Set([...gaps, ...sameWhat(stories)])];
};

/** The reviewer's file: its challenges, and how many records it read. */
export const gateReview = (review: unknown, recordCount: number): string[] => {
    const parsed = decodeWith(
        Schema.Struct({
            read: Schema.Int,
            challenges: Schema.Array(Schema.Struct({ record: Schema.Int, says: Schema.String })),
        }),
        review,
    );
    if (!parsed.ok) return [`the review does not match its shape: ${parsed.problem}`];
    return parsed.value.read === recordCount
        ? []
        : [`the review says it read ${parsed.value.read} records of ${recordCount}`];
};
