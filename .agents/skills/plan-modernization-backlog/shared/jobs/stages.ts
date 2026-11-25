import { existsSync, mkdirSync, renameSync } from "node:fs";
import { basename, join } from "node:path";
import type { Layout } from "../model/layout";
import type { ModernizationRequest } from "../model/request";
import { Decision, TargetLayer } from "../model/records";
import { Schema } from "effect";
import { bundleName } from "../derive/publish";
import { deriveFacts, type Facts } from "../derive/facts";
import { carriedFrom } from "../derive/scope";
import { loadTarget, type Target } from "../read/target";
import { componentOwners, unitsOf } from "../derive/target-plan";
import { ruleChangesOf } from "../derive/consistency";
import { readAnalysis } from "../read/analysis";
import type { JobFile } from "./gates";
import { jobPaths, readJson, saveJobs, slug, writeJson, type Job, type Jobs, type Kind } from "./state";

const FOUNDATION_BASE_AREAS = ["libraries", "tooling and environment", "testing", "knowledge in code"];
/** The most actions plus owned rules one surface job holds, so an agent can read every line it is given. */
export const SURFACE_JOB_BUDGET = 90;

export type Accepted = { layers: TargetLayer[]; decisions: Decision[] };

/** Everything accepted so far: the outputs of decided jobs. */
export const acceptedSoFar = (layout: Layout, jobs: Jobs): Accepted => {
    const layers: TargetLayer[] = [];
    const decisions: Decision[] = [];
    for (const job of jobs.jobs.filter((each) => each.state === "decided")) {
        const path = jobPaths(layout, job.id).output;
        if (!existsSync(path)) continue;
        const out = readJson<{ layers?: unknown; decisions?: unknown }>(path);
        if (out.layers) layers.push(...Schema.decodeUnknownSync(Schema.Array(TargetLayer))(out.layers));
        // Writers number their decisions independently, so an id is made unique here by the job it came from.
        if (out.decisions)
            decisions.push(
                ...Schema.decodeUnknownSync(Schema.Array(Decision))(out.decisions).map((d) => ({
                    ...d,
                    id: `${job.id}.${d.id}` as Decision["id"],
                })),
            );
    }
    return { layers, decisions };
};

/** What a layers or base decision must know of the confirmed target: the parts, their technologies and their modules. */
const architectureOf = (target: Target | undefined) =>
    target === undefined
        ? undefined
        : {
              containers: target.architecture.containers.map((container) => ({
                  name: container.name,
                  kind: container.kind,
                  tech: container.tech,
                  holds: container.holds,
              })),
              modules: target.architecture.components.map((component) => ({
                  module: component.module,
                  domain: component.domain,
              })),
          };

const contextOf = (request: ModernizationRequest, facts: Facts, accepted: Accepted, target?: Target) => ({
    ...(target === undefined ? {} : { architecture: architectureOf(target) }),
    purpose: facts.purpose,
    capabilities: facts.capabilities.map((c) => ({ name: c.name, purpose: c.purpose, actions: c.size })),
    outsideSystems: facts.externals.map((e) => e.name),
    stack: request.stack,
    notes: request.notes,
    documents: request.documents,
    layers: accepted.layers.map((l) => ({
        id: l.id,
        name: l.name,
        path: l.path,
        purpose: l.purpose,
        check: l.check,
        carries: l.carries,
        ...(l.role === undefined ? {} : { role: l.role }),
        ...(l.container === undefined ? {} : { container: l.container }),
    })),
    decisions: accepted.decisions.map((d) => ({ id: d.id, topic: d.topic, layer: d.layer, chose: d.chose })),
});

/** The names of the outside systems a component of the architecture adapts: that component's story builds them. */
export const adaptedSystems = (target: Target, facts: Facts) => {
    const names = new Map(facts.externals.map((external) => [external.id, external.name]));
    return [
        ...new Set(
            target.architecture.components.flatMap((component) =>
                component.adapts === undefined ? [] : [names.get(component.adapts) ?? component.adapts],
            ),
        ),
    ];
};

type Draft = { id: string; kind: Kind; title: string; after: string[]; file: JobFile; extra?: Record<string, unknown> };

/** The jobs that write the stories of a confirmed target: shared components first, then one job for each journey. */
const targetStories = (layout: Layout, facts: Facts, target: Target): Draft[] => {
    const owners = componentOwners(target);
    const says = (id: string) => facts.rules.get(id)?.says ?? "";
    const detail = (name: string) => {
        const component = target.architecture.components.find((each) => each.name === name);
        return component === undefined
            ? undefined
            : {
                  name,
                  domain: component.domain,
                  responsibility: component.responsibility,
                  module: component.module,
                  uses: component.uses,
                  adapts: component.adapts,
                  platform: component.platform,
                  enforces: component.enforces.map((id) => ({ id, says: says(id) })),
              };
    };
    const rulesOf = (names: readonly string[]) => [
        ...new Set(
            names.flatMap((name) => target.architecture.components.find((each) => each.name === name)?.enforces ?? []),
        ),
    ];
    // The rules a journey step changes: a story citing one must cite the step and say what the rule does now.
    const changes = ruleChangesOf(target);
    const ruleChanges = (rules: readonly string[]) =>
        Object.fromEntries(rules.flatMap((id) => (changes.has(id) ? [[id, [...(changes.get(id) ?? [])]]] : [])));
    const componentRules = Object.fromEntries(
        target.architecture.components.map((component) => [component.name, [...component.enforces]]),
    );
    const sharedNames = target.architecture.components
        .filter((c) => owners.get(c.name) === "shared")
        .map((c) => c.name);
    // Whole units go to a job, in the order of their key, so a unit is never split between two writers.
    const units = unitsOf(target);
    const byUnit = new Map<string, string[]>();
    for (const name of sharedNames) byUnit.set(units.get(name) ?? "", [...(byUnit.get(units.get(name) ?? "") ?? []), name]);
    const packs: string[][] = [];
    let weight = 0;
    for (const [, names] of [...byUnit.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const cost = names.reduce((sum, name) => sum + 1 + (componentRules[name]?.length ?? 0), 0);
        if (packs.length === 0 || weight + cost > 60) {
            packs.push([]);
            weight = 0;
        }
        packs.at(-1)?.push(...names);
        weight += cost;
    }
    const shared: Draft[] = packs.map((names, at) => ({
        id: `shared-${at + 1}`,
        kind: "components",
        title: `Write the stories of the shared components, part ${at + 1}`,
        after: [],
        file: {
            kind: "components",
            components: names,
            cite: rulesOf(names),
            componentRules,
            units: Object.fromEntries(names.map((name) => [name, units.get(name) ?? ""])),
            ruleChanges: ruleChanges(rulesOf(names)),
        },
        extra: { componentDetails: names.map(detail) },
    }));
    const journeys: Draft[] = target.journeys.map((journey) => {
        const own = target.architecture.components.filter((c) => owners.get(c.name) === journey.id).map((c) => c.name);
        const stepActions = Object.fromEntries(
            journey.steps.map((step) => [step.id, step.link._tag === "legacy" ? [...step.link.from] : []]),
        );
        const sharedUsed = [
            ...new Set(own.flatMap((name) => target.architecture.components.find((c) => c.name === name)?.uses ?? [])),
        ].filter((name) => owners.get(name) !== journey.id);
        const surfaces = new Set(
            Object.values(stepActions)
                .flat()
                .flatMap((id) =>
                    facts.capabilities.flatMap((c) =>
                        c.surfaces
                            .filter((s) => s.actions.some((a) => a.id === id))
                            .map((s) => bundleName(s.name, c.name)),
                    ),
                ),
        );
        return {
            id: `journey-${slug(journey.task)}`,
            kind: "journey" as const,
            title: `Write the stories of the journey ${journey.name}`,
            after: shared.map((draft) => draft.id),
            file: {
                kind: "journey",
                steps: journey.steps.map((step) => step.id),
                stepActions,
                actions: [...new Set(Object.values(stepActions).flat())],
                components: own,
                cite: rulesOf(own),
                componentRules,
                ruleChanges: ruleChanges(rulesOf(own)),
            },
            extra: {
                journey: { name: journey.name, idea: journey.idea, outcome: target.outcomes.get(journey.task) ?? "" },
                stepDetails: journey.steps.map((step) => ({
                    id: step.id,
                    intent: step.intent,
                    system: step.system,
                    change: step.link._tag === "legacy" ? step.link.change : "new",
                    reason: step.link.reason,
                    today:
                        step.link._tag === "legacy"
                            ? step.link.from.map((id) => ({
                                  id,
                                  what:
                                      facts.capabilities
                                          .flatMap((c) => c.surfaces.flatMap((s) => s.actions))
                                          .find((a) => a.id === id)?.purpose ?? "",
                              }))
                            : [],
                    keeps: step.link._tag === "legacy" ? step.link.keeps.map((id) => ({ id, says: says(id) })) : [],
                    changes: (step.changes ?? []).map((change) => ({
                        rule: change.rule,
                        says: says(change.rule),
                        to: change.to,
                    })),
                })),
                ownComponents: own.map(detail),
                usedComponents: sharedUsed.map(detail),
                bundles: [...surfaces]
                    .map((name) => join(layout.analysisBundles, name))
                    .filter((path) => existsSync(path)),
            },
        };
    });
    return [...shared, ...journeys];
};

/**
 * Makes the jobs of a stage, with their input files. Deterministic: the same request, analysis and accepted records give
 * the same jobs. The foundation stage needs only the request and the analysis; the stories stage needs the foundation's
 * accepted records, from which it learns what is carried.
 * @param layout the run's folders
 * @param stage the stage
 * @returns the jobs written to the job state
 */
export const prepareStage = (
    layout: Layout,
    stage: "foundation" | "stories",
    request: ModernizationRequest,
    jobs: Jobs,
): Jobs => {
    const analysis = readAnalysis(layout.analysis);
    const accepted = acceptedSoFar(layout, jobs);
    const target = loadTarget(layout);
    const { ids } = carriedFrom(analysis, accepted.decisions);
    const facts = deriveFacts(analysis, stage === "foundation" || target !== undefined ? undefined : ids);
    const drafts: Draft[] = [];
    const layerIds = accepted.layers.map((l) => l.id as string);
    if (stage === "foundation") {
        drafts.push({
            id: "layers",
            kind: "layers",
            title: "Decide the layers of the target codebase",
            after: [],
            file: {
                kind: "layers",
                stack: [...request.stack],
                ...(target === undefined
                    ? {}
                    : {
                          techs: target.architecture.containers.map((container) => container.tech),
                          containers: target.architecture.containers.map((container) => container.name),
                      }),
            },
        });
        drafts.push({
            id: "integrations",
            kind: "integrations",
            title: "Decide how each outside system is carried",
            after: ["layers"],
            file: { kind: "integrations", externals: facts.externals.map((e) => e.name) },
            extra: { externalSystems: facts.externals },
        });
        // With a confirmed target the scope is already decided, step by step, as what a journey drops.
        if (target === undefined)
            drafts.push({
                id: "scope",
                kind: "scope",
                title: "Decide which capabilities are carried, replaced or dropped",
                after: ["integrations"],
                file: { kind: "scope", capabilities: facts.capabilities.map((c) => c.name) },
                extra: {
                    capabilityDetails: facts.capabilities.map((c) => ({
                        name: c.name,
                        purpose: c.purpose,
                        actions: c.size,
                    })),
                },
            });
        if (request.notes.length > 0)
            drafts.push({
                id: "notes",
                kind: "notes",
                title: "Decide how each note is honoured",
                after: ["layers"],
                file: { kind: "notes", notes: [...request.notes] },
            });
        drafts.push({
            id: "base",
            kind: "base",
            title: "Decide libraries, tooling, testing and the conventions of each layer",
            after: ["layers", "integrations"],
            file: { kind: "base", areas: FOUNDATION_BASE_AREAS },
        });
        drafts.push({
            id: "foundation-stories",
            kind: "foundation-stories",
            title: "Write the technical stories of the foundation",
            after: drafts
                .map((d) => d.id)
                .filter((id) => id !== "layers")
                .concat("layers"),
            file: {
                kind: "foundation-stories",
                ...(target === undefined ? {} : { adapted: adaptedSystems(target, facts) }),
            },
        });
    } else if (target !== undefined) {
        drafts.push(...targetStories(layout, facts, target));
    } else {
        throw new Error("the stories stage plans a decided target: run shape-target first");
    }
    // What an earlier run of this stage wrote is put aside, so a new run never mixes with it.
    const earlier = jobs.jobs.filter((job) => job.stage === stage);
    if (earlier.length > 0) {
        const aside = join(layout.work, "archive", `${stage}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
        for (const job of earlier)
            for (const path of Object.values(jobPaths(layout, job.id)))
                if (existsSync(path)) {
                    mkdirSync(aside, { recursive: true });
                    renameSync(path, join(aside, basename(path)));
                }
    }
    const made: Job[] = drafts.map((draft) => ({
        id: draft.id,
        stage,
        kind: draft.kind,
        title: draft.title,
        after: draft.after,
        state: "toRun",
        fixes: 0,
        feedback: "",
        disputes: [],
    }));
    for (const draft of drafts) {
        const paths = jobPaths(layout, draft.id);
        const file: JobFile = {
            ...draft.file,
            layerIds,
            decisionIds: accepted.decisions.map((d) => d.id as string),
            areaDecisionIds: accepted.decisions.filter((d) => d.topic._tag === "area").map((d) => d.id as string),
        };
        writeJson(paths.job, { ...file, ...draft.extra });
        writeJson(paths.context, contextOf(request, facts, accepted, target));
    }
    const next: Jobs = {
        ...jobs,
        stages: [...new Set([...jobs.stages, stage])],
        jobs: [...jobs.jobs.filter((job) => job.stage !== stage), ...made],
    };
    saveJobs(layout, next);
    return next;
};

/**
 * A job's inputs name what earlier jobs decided (layers, decisions), which did not exist when the stage was prepared.
 * Called when a job is handed out, it patches the job file and the context file with what is accepted by then.
 * @param layout the run's folders
 * @param jobs the job state
 * @param id the job about to be dispatched
 */
export const refreshInputs = (layout: Layout, jobs: Jobs, id: string) => {
    const paths = jobPaths(layout, id);
    const accepted = acceptedSoFar(layout, jobs);
    const file = readJson<Record<string, unknown>>(paths.job);
    const adapted = Array.isArray(file.adapted) ? (file.adapted as string[]) : undefined;
    writeJson(paths.job, {
        ...file,
        ...(adapted === undefined
            ? {}
            : {
                  adaptedDecisionIds: accepted.decisions
                      .filter((d) => d.topic._tag === "integration" && adapted.includes(d.topic.system))
                      .map((d) => d.id as string),
              }),
        layerIds: accepted.layers.map((l) => l.id as string),
        decisionIds: accepted.decisions.map((d) => d.id as string),
        areaDecisionIds: accepted.decisions.filter((d) => d.topic._tag === "area").map((d) => d.id as string),
    });
    const context = readJson<Record<string, unknown>>(paths.context);
    writeJson(paths.context, {
        ...context,
        layers: accepted.layers.map((l) => ({
            id: l.id,
            name: l.name,
            path: l.path,
            purpose: l.purpose,
            check: l.check,
            carries: l.carries,
            ...(l.role === undefined ? {} : { role: l.role }),
            ...(l.container === undefined ? {} : { container: l.container }),
        })),
        decisions: accepted.decisions.map((d) => ({
            id: d.id,
            topic: d.topic,
            layer: d.layer,
            chose: d.chose,
            reason: d.reason,
        })),
    });
};
