import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { Decision, Story, TargetLayer } from "../model/records";
import { ModernizationRequest } from "../model/request";
import { readAnalysis } from "../read/analysis";
import { checkPlan, type Gaps } from "./gates";
import { buildPlan } from "./plan";
import { loadTarget } from "../read/target";
import { buildTargetPlan } from "./target-plan";
import { splitCycles } from "./cycles";
import { carriedFrom } from "./scope";
import { deriveFacts } from "./facts";
import { publishPlan } from "./publish";
import { sectionOf } from "./agents-md";
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
    // A story caught in a cycle of waits is split by component, so every story can be ordered.
    const stories = target === undefined ? revised : splitCycles(revised, target).stories;
    // With a confirmed target every capability is planned: what is not carried was dropped there, step by step.
    const { ids } = carriedFrom(analysis, decisions);
    const facts = deriveFacts(analysis, target === undefined ? ids : undefined);
    const stamp = { root: analysis.root, fingerprint: analysis.fingerprint };
    const { plan, problems } =
        target === undefined
            ? buildPlan({ analysis: stamp, facts, request, layers, decisions, stories })
            : buildTargetPlan({ analysis: stamp, facts, layers, decisions, stories, target });
    const gaps = checkPlan({ analysis, facts, request, layers, decisions, stories, plan, problems, target });
    return { plan, facts, request, gaps, stories, target };
};

/**
 * Derives everything from the accepted records, checks it, and writes the plan and the work items when the failing gates
 * pass. Safe to run again: it replaces what it wrote.
 * @param layout the run's folders
 * @param workTrackingFrom a markdown file whose `## Work tracking` section is copied into the root AGENTS.md preview
 * @returns the gaps, and whether the plan was written
 */
export const runBuild = (
    layout: Layout,
    workTrackingFrom?: string,
): { gaps: Gaps; written: boolean; stories: number } => {
    const { plan, facts, request, gaps, target } = evaluatePlan(layout);
    if (gaps.failing.length > 0) return { gaps, written: false, stories: plan.stories.length };
    const workTracking =
        workTrackingFrom && existsSync(workTrackingFrom)
            ? (sectionOf(readFileSync(workTrackingFrom, "utf8"), "Work tracking") ?? "")
            : "";
    publishPlan(
        layout,
        plan,
        facts,
        request,
        workTracking === "" ? "(Written from the workspace's Work tracking section when scaffold runs.)" : workTracking,
        resolve(import.meta.dir, "../.."),
        target,
    );
    return { gaps, written: true, stories: plan.stories.length };
};
