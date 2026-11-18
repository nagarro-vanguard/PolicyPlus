import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Layout } from "../model/layout";
import type { ModernizationRequest } from "../model/request";
import { Decision, TargetLayer } from "../model/records";
import { Schema } from "effect";
import { bundleName } from "../derive/publish";
import { deriveFacts, type Facts, type Surface } from "../derive/facts";
import { carriedFrom } from "../derive/scope";
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

const contextOf = (request: ModernizationRequest, facts: Facts, accepted: Accepted) => ({
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
        carries: l.carries,
    })),
    decisions: accepted.decisions.map((d) => ({ id: d.id, topic: d.topic, layer: d.layer, chose: d.chose })),
});

const chunk = <T>(items: readonly T[], size: number) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, at) => items.slice(at * size, at * size + size));

type Draft = { id: string; kind: Kind; title: string; after: string[]; file: JobFile; extra?: Record<string, unknown> };

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
    const { ids } = carriedFrom(analysis, accepted.decisions);
    const facts = deriveFacts(analysis, stage === "foundation" ? undefined : ids);
    const drafts: Draft[] = [];
    const layerIds = accepted.layers.map((l) => l.id as string);
    const allow = request.target.split("/").filter(Boolean).slice(-1);
    if (stage === "foundation") {
        drafts.push({
            id: "layers",
            kind: "layers",
            title: "Decide the layers of the target codebase",
            after: [],
            file: { kind: "layers", stack: [...request.stack] },
        });
        drafts.push({
            id: "integrations",
            kind: "integrations",
            title: "Decide how each outside system is carried",
            after: ["layers"],
            file: { kind: "integrations", externals: facts.externals.map((e) => e.name) },
            extra: { externalSystems: facts.externals },
        });
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
            file: { kind: "foundation-stories" },
        });
    } else {
        const shared = chunk(facts.shared, 60);
        shared.forEach((rules, at) =>
            drafts.push({
                id: `shared-${at + 1}`,
                kind: "shared",
                title: `Write the stories of the shared rules, part ${at + 1}`,
                after: [],
                file: {
                    kind: "shared",
                    shared: rules,
                    transitions: at === 0 ? facts.transitions.filter((t) => t.owner === "shared").map((t) => t.id) : [],
                },
                extra: {
                    rules: rules.map((id) => ({
                        id,
                        says: facts.rules.get(id)?.says,
                        place: facts.rules.get(id)?.place,
                    })),
                },
            }),
        );
        // A change of state is cited by the story that builds the rule gating it; one no rule gates goes to the first
        // capability that touches its kind of data.
        const unowned = new Map(facts.transitions.filter((t) => t.owner === "").map((t) => [t.id, t]));
        for (const capability of facts.capabilities) {
            const entities = new Set(capability.data.map((d) => d.id));
            const fallback = [...unowned.values()].filter((t) => entities.has(t.entity));
            for (const t of fallback) unowned.delete(t.id);
            let group: Surface[] = [];
            let weight = 0;
            const flush = () => {
                if (group.length === 0) return;
                const number = drafts.filter((d) => d.id.startsWith(`surfaces-${slug(capability.name)}-`)).length + 1;
                const first = number === 1;
                const keys = new Set(group.map((s) => s.key));
                const mine = [...facts.transitions.filter((t) => keys.has(t.owner)), ...(first ? fallback : [])];
                const bundles = group.map((s) => join(layout.analysisBundles, bundleName(s.name, capability.name)));
                drafts.push({
                    id: `surfaces-${slug(capability.name)}-${number}`,
                    kind: "surfaces",
                    title: `Write the stories of ${capability.name}, part ${number}`,
                    after: shared.map((_, at) => `shared-${at + 1}`),
                    file: {
                        kind: "surfaces",
                        actions: group.flatMap((s) => s.actions.map((a) => a.id)),
                        owned: group.flatMap((s) => s.owned),
                        transitions: mine.map((t) => t.id),
                        surfaces: group.map((s) => ({
                            key: s.key,
                            name: s.name,
                            actions: s.actions.map((a) => a.id),
                            owned: s.owned,
                        })),
                        allow,
                    },
                    extra: {
                        capability: {
                            name: capability.name,
                            purpose: capability.purpose,
                            dataKinds: capability.data.map((d) => ({ id: d.id, name: d.name, access: d.access })),
                        },
                        surfaceDetails: group.map((s) => ({
                            name: s.name,
                            actions: s.actions.map((a) => ({
                                id: a.id,
                                name: a.name,
                                purpose: a.purpose,
                                startedBy: a.startedBy,
                                place: a.place,
                            })),
                            owned: s.owned.map((id) => ({
                                id,
                                says: facts.rules.get(id)?.says,
                                place: facts.rules.get(id)?.place,
                            })),
                            reliesOn: s.relies.map((r) => ({
                                says: facts.rules.get(r.rule)?.says,
                                builtBy: r.owner === "shared" ? "a shared story" : "an earlier part of this capability",
                            })),
                        })),
                        transitionDetails: mine.map((t) => ({
                            id: t.id,
                            entity: t.entityName,
                            from: t.from,
                            to: t.to,
                            place: t.place,
                        })),
                        bundles: bundles.filter((path) => existsSync(path)),
                    },
                });
                group = [];
                weight = 0;
            };
            for (const surface of capability.surfaces) {
                const cost = surface.actions.length + surface.owned.length;
                if (group.length > 0 && weight + cost > SURFACE_JOB_BUDGET) flush();
                group.push(surface);
                weight += cost;
            }
            flush();
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
        writeJson(paths.context, contextOf(request, facts, accepted));
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
    writeJson(paths.job, {
        ...file,
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
            carries: l.carries,
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
