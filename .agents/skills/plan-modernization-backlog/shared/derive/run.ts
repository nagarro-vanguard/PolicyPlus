import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { Decision, Story, TargetLayer } from "../model/records";
import { ModernizationRequest } from "../model/request";
import { readAnalysis } from "../read/analysis";
import { checkPlan, type Gaps } from "./gates";
import { loadTarget } from "../read/target";
import { buildTargetPlan } from "./target-plan";
import { ruleCoverage } from "./target-gates";
import { deriveFacts } from "./facts";
import { contextsOf, publishPlan, writeChoices } from "./publish";
import { builtFromNow } from "./built-from";
import { goalsSha } from "../model/goals-sha";
import { dedupeCarriers } from "./carriers";
import { planConflicts, targetConflicts } from "./conflicts";
import type { Plan } from "../model/plan";
import { applyAll, type Entry } from "./revisions";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;
export const writeJson = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

export const recordFiles = (layout: Layout) => ({
    layers: join(layout.records, "layers.json"),
    decisions: join(layout.records, "decisions.json"),
    stories: join(layout.records, "stories.json"),
});

/** The accepted records of a run, each decoded against its schema. */
export const loadRecords = (layout: Layout) => {
    const files = recordFiles(layout);
    const get = <A, I>(schema: Schema.Codec<A, I>, path: string): A[] =>
        existsSync(path) ? (Schema.decodeUnknownSync(Schema.Array(schema))(readJson(path)) as A[]) : [];
    return {
        layers: get(TargetLayer, files.layers),
        decisions: get(Decision, files.decisions),
        stories: get(Story, files.stories),
    };
};

export const loadRequest = (layout: Layout) =>
    Schema.decodeUnknownSync(ModernizationRequest)(readJson(layout.requestJson));

export const revisionsFile = (layout: Layout) => join(layout.work, "revisions.json");
export const loadRevisions = (layout: Layout): Entry[] =>
    existsSync(revisionsFile(layout)) ? (readJson(revisionsFile(layout)) as Entry[]) : [];
export const saveRevisions = (layout: Layout, entries: readonly Entry[]) => writeJson(revisionsFile(layout), entries);

/**
 * Derives the plan from the accepted records with the revisions applied, and checks every gate, without writing
 * anything.
 * @param layout the run's folders
 * @param entries the revisions to apply, in order; the saved ones by default
 * @returns the plan, the facts, the records and the gaps
 */
export const evaluatePlan = (layout: Layout, entries: readonly Entry[] = loadRevisions(layout)) => {
    const request = loadRequest(layout);
    const analysis = readAnalysis(layout.analysis);
    const records = loadRecords(layout);
    const { layers, decisions } = records;
    const revised = applyAll(records.stories, entries);
    const target = loadTarget(layout);
    if (target === undefined) throw new Error("the plan is made from a decided target: run shape-target first");
    // An outside system a component adapts is built by that component's story alone.
    const { stories, moved } = dedupeCarriers(revised, decisions, target, analysis.system.externals);
    // With a decided target every capability is planned: what is not carried was dropped there, step by step.
    const facts = deriveFacts(analysis);
    const stamp = { root: analysis.root, fingerprint: analysis.fingerprint };
    const built = buildTargetPlan({ analysis: stamp, facts, layers, decisions, stories, target });
    const { problems } = built;
    const bare: Plan = {
        ...built.plan,
        builtFrom: builtFromNow(layout, analysis.fingerprint),
        goalsSha: goalsSha(request.goals),
    };
    const plan: Plan = {
        ...bare,
        conflicts: [
            ...(target === undefined
                ? []
                : targetConflicts(
                      layout,
                      target.architecture.components.map((component) => component.name),
                  )),
            ...planConflicts(layout, bare),
            ...(target === undefined
                ? []
                : ruleCoverage({ plan: bare, facts, target, bundle: analysis.bundle }).challenges.map((says) => ({
                      stage: "stories",
                      job: "rule coverage",
                      record: -1,
                      variant: "",
                      says,
                      resolved: false,
                  }))),
        ],
    };
    const checked = checkPlan({ analysis, facts, request, layers, decisions, stories, plan, problems, target });
    const gaps: Gaps = {
        failing: checked.failing,
        advisory: [...checked.advisory, ...moved],
    };
    return { plan, facts, request, gaps, stories, target };
};

/**
 * Derives everything from the accepted records, checks it, and writes the plan, its story bodies and contexts when the failing gates
 * pass. Safe to run again: it replaces what it wrote.
 * @param layout the run's folders
 * @returns the gaps, and whether the plan was written
 */
export const runBuild = (layout: Layout): { gaps: Gaps; written: boolean; stories: number } => {
    const { plan, facts, request, gaps, target } = evaluatePlan(layout);
    if (gaps.failing.length > 0) return { gaps, written: false, stories: plan.stories.length };
    const contexts = contextsOf(layout, plan, facts, request, target);
    const checked = { failing: contexts.problems, advisory: [...gaps.advisory, ...contexts.advisory] };
    if (checked.failing.length > 0) return { gaps: checked, written: false, stories: plan.stories.length };
    publishPlan(layout, plan, contexts.texts, request);
    writeChoices(layout, plan);
    return { gaps: checked, written: true, stories: plan.stories.length };
};
