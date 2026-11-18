import { Schema } from "effect";
import { Decision, Story, TargetLayer } from "../model/records";
import { mechanicalProblems, readerProblems, recordIdProblems } from "../derive/language";
import { AGENTS_MD_MAX_LINES, countedLines, layerAgentsMd } from "../derive/agents-md";
import type { Kind } from "./state";

/** What a job hands the gate: its own inputs and the records accepted before it. */
export type JobFile = {
    kind: Kind;
    stack?: string[];
    externals?: string[];
    capabilities?: string[];
    notes?: string[];
    areas?: string[];
    actions?: string[];
    owned?: string[];
    shared?: string[];
    transitions?: string[];
    surfaces?: { key: string; name: string; actions: string[]; owned: readonly string[] }[];
    allow?: string[];
    techs?: string[];
    steps?: string[];
    stepActions?: Record<string, string[]>;
    components?: string[];
    cite?: string[];
    componentRules?: Record<string, string[]>;
    layerIds?: string[];
    decisionIds?: string[];
    areaDecisionIds?: string[];
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
    if (job.kind === "integrations" || job.kind === "scope" || job.kind === "notes" || job.kind === "base") {
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
        } else if (job.kind === "notes") {
            want(
                "note",
                (job.notes ?? []).map((_, at) => String(at + 1)),
                decisions.flatMap((d) => (d.topic._tag === "note" ? [String(d.topic.number)] : [])),
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
    if (job.kind === "journey" || job.kind === "components") return targetStoryGaps(job, stories);
    const actions = new Set(job.actions ?? []);
    const owned = new Set(job.owned ?? []);
    const shared = new Set(job.shared ?? []);
    const decisions = new Set(job.decisionIds ?? []);
    const seen = new Map<string, number>();
    const cited = new Set<string>();
    const citedDecisions = new Set<string>();
    for (const story of stories) {
        if (story.criteria.length > 12)
            gaps.push(`story "${short(story.title)}" has ${story.criteria.length} criteria, over 12`);
        for (const id of story.actions) {
            seen.set(id, (seen.get(id) ?? 0) + 1);
            if (!actions.has(id)) gaps.push(`story "${short(story.title)}" names an action this job does not own`);
        }
        const bySurface = new Set(story.actions.map((id) => job.surfaces?.find((s) => s.actions.includes(id))?.key));
        if (bySurface.size > 1) gaps.push(`story "${short(story.title)}" spans more than one surface`);
        for (const criterion of story.criteria) {
            for (const ref of criterion.from) {
                if (ref._tag === "rule") {
                    if (job.kind === "surfaces" && !owned.has(ref.id))
                        gaps.push(`story "${short(story.title)}" cites a rule this job does not build`);
                    if (job.kind === "shared" && !shared.has(ref.id))
                        gaps.push(`story "${short(story.title)}" cites a rule that is not shared`);
                    if (job.kind === "foundation-stories")
                        gaps.push(
                            `story "${short(story.title)}" cites a legacy rule; foundation stories rest on decisions`,
                        );
                    if (cited.has(ref.id)) gaps.push(`a rule is cited twice in this job`);
                    cited.add(ref.id);
                } else if (ref._tag === "transition") {
                    if (!(job.transitions ?? []).includes(ref.id))
                        gaps.push(`story "${short(story.title)}" cites a change of state this job does not own`);
                    cited.add(ref.id);
                } else if (ref._tag === "decision") {
                    if (!decisions.has(ref.id))
                        gaps.push(`story "${short(story.title)}" cites a decision that does not exist`);
                    citedDecisions.add(ref.id);
                }
            }
        }
        const mech = mechanicalProblems(story.title);
        if (mech.length > 0) gaps.push(`story "${short(story.title)}": ${mech.join(", ")}`);
        const functional = story.actions.length > 0;
        if (job.kind === "surfaces" && !functional)
            gaps.push(`story "${short(story.title)}" has no actions; a surface story ports actions`);
        if (job.kind !== "surfaces" && functional)
            gaps.push(`story "${short(story.title)}" has actions; this job writes technical stories`);
        const texts = [
            story.title,
            story.what,
            story.why,
            ...story.criteria.map((c) => c.says),
            ...story.terms.flatMap((t) => [t.name, t.means]),
            ...(story.journey ? [story.journey.name, ...story.journey.steps] : []),
            ...(story.open ?? []),
        ];
        const found = texts.flatMap((text) => (functional ? readerProblems(text, job.allow) : recordIdProblems(text)));
        if (found.length > 0)
            gaps.push(
                `story "${short(story.title)}" shows the code or the analysis: ${[...new Set(found)].slice(0, 3).join("; ")}`,
            );
    }
    if (job.kind === "surfaces") {
        const missing = [...actions].filter((id) => !seen.has(id));
        if (missing.length > 0) gaps.push(`${missing.length} actions are in no story`);
        if ([...seen.values()].some((n) => n > 1)) gaps.push("an action is in more than one story");
        const unbuilt = [...owned].filter((id) => !cited.has(id));
        if (unbuilt.length > 0) gaps.push(`${unbuilt.length} rules this job builds are cited by no criterion`);
        const missingT = (job.transitions ?? []).filter((id) => !cited.has(id));
        if (missingT.length > 0) gaps.push(`${missingT.length} changes of state are cited by no criterion`);
    } else if (job.kind === "shared") {
        const unbuilt = [...shared].filter((id) => !cited.has(id));
        if (unbuilt.length > 0) gaps.push(`${unbuilt.length} shared rules are cited by no criterion`);
        const missingT = (job.transitions ?? []).filter((id) => !cited.has(id));
        if (missingT.length > 0) gaps.push(`${missingT.length} changes of state are cited by no criterion`);
    } else {
        const missing = (job.areaDecisionIds ?? []).filter((id) => !citedDecisions.has(id));
        if (missing.length > 0) gaps.push(`${missing.length} area decisions are cited by no story`);
    }
    void AGENTS_MD_MAX_LINES;
    void countedLines;
    void layerAgentsMd;
    return [...new Set(gaps)];
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
const targetStoryGaps = (job: JobFile, stories: readonly Story[]): string[] => {
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
        if (story.criteria.length > 12) gaps.push(`${label} has ${story.criteria.length} criteria, over 12`);
        const wanted = new Set((story.steps ?? []).flatMap((id) => job.stepActions?.[id] ?? []));
        const have = new Set<string>(story.actions);
        if ([...wanted].some((id) => !have.has(id)) || [...have].some((id) => !wanted.has(id)))
            gaps.push(`${label}: its entry points must be exactly those of its steps`);
        if (!journey && (story.actions.length > 0 || (story.steps ?? []).length > 0))
            gaps.push(`${label} is a technical story of shared components: no steps and no entry points`);
        if (journey && (story.steps ?? []).length === 0) gaps.push(`${label} names no step of the journey`);
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
            for (const ref of criterion.from)
                if (ref._tag === "decision" && !decisions.has(ref.id))
                    gaps.push(`${label} cites a decision that does not exist`);
        const missing = [...enforced].filter((id) => !rules.includes(id));
        if (missing.length > 0)
            gaps.push(`${label} builds components whose ${missing.length} rules no criterion cites`);
        const mech = mechanicalProblems(story.title);
        if (mech.length > 0) gaps.push(`${label}: ${mech.join(", ")}`);
        const texts = [
            story.title,
            story.what,
            story.why,
            ...story.criteria.map((c) => c.says),
            ...story.terms.flatMap((t) => [t.name, t.means]),
            ...(story.journey ? [story.journey.name, ...story.journey.steps] : []),
            ...(story.open ?? []),
        ];
        const found = texts.flatMap((text) =>
            story.actions.length > 0 ? readerProblems(text, job.allow) : recordIdProblems(text),
        );
        if (found.length > 0)
            gaps.push(`${label} shows the code or the analysis: ${[...new Set(found)].slice(0, 3).join("; ")}`);
    }
    exactly("rules", job.cite ?? [], [[...cited]], gaps);
    return [...new Set(gaps)];
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
