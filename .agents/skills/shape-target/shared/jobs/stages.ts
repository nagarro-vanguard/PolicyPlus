import { existsSync } from "node:fs";
import { join } from "node:path";
import { relevantSteps, type ComponentContext, type DesignContext } from "../derive/checks";
import { deriveEssence } from "../derive/essence";
import { confirmed } from "../gates";
import { slug } from "../model/ids";
import type { Layout } from "../model/layout";
import type { StoredArchitecture, Task } from "../model/records";
import {
    loadArchitectureVariants,
    loadChoice,
    loadJourneys,
    loadLegacy,
    loadRequest,
    loadTasks,
    needsOf,
} from "../run";
import { Merge } from "../model/records";
import { Schema } from "effect";
import type { JobFile } from "./gates";
import {
    jobPaths,
    loadJobs,
    outputOf,
    readJson,
    saveJobs,
    writeJson,
    type Job,
    type Jobs,
    type Kind,
    type Stage,
} from "./state";

type Draft = {
    id: string;
    kind: Kind;
    title: string;
    after: string[];
    review: boolean;
    file: JobFile;
    context: unknown;
};

/** The most entry points plus rules one journeys job holds, so an agent can read every line it is given. */
export const VARIANT_JOB_BUDGET = 70;

/** The tasks written by the decided tasks jobs, their ids made unique by the job they came from. */
export const acceptedTasks = (layout: Layout, jobs: Jobs): Task[] =>
    jobs.jobs
        .filter((job) => job.kind === "tasks" && job.state === "decided")
        .flatMap((job) =>
            (outputOf<{ tasks: Task[] }>(layout, job.id)?.tasks ?? []).map((task) => ({
                ...task,
                id: `${job.id}.${task.id}`,
            })),
        );

/** The tasks after the merge job's decisions: each merged task takes in the ones it absorbs. */
export const mergedTasks = (layout: Layout, jobs: Jobs): Task[] => {
    const tasks = acceptedTasks(layout, jobs);
    const merges = Schema.decodeUnknownSync(Schema.Array(Merge))(
        outputOf<{ merges: unknown }>(layout, "merge")?.merges ?? [],
    );
    const absorbed = new Set(merges.flatMap((merge) => merge.absorb));
    return tasks
        .filter((task) => !absorbed.has(task.id))
        .map((task) => {
            const joined = merges.find((merge) => merge.keep === task.id);
            if (joined === undefined) return task;
            const others = joined.absorb.flatMap((id) => tasks.filter((each) => each.id === id));
            const union = <T>(pick: (each: Task) => readonly T[]) => [...new Set([task, ...others].flatMap(pick))];
            return {
                ...task,
                actions: union((each) => each.actions),
                rules: union((each) => each.rules),
                facts: union((each) => each.facts),
                needs: union((each) => each.needs),
                current: [task, ...others].flatMap((each) => each.current),
            };
        });
};

export const designContext = (layout: Layout): DesignContext => ({
    legacy: loadLegacy(layout),
    journeys: loadJourneys(layout),
    needs: needsOf(loadTasks(layout)),
    stack: loadRequest(layout).stack,
});

/** The variant of the architecture the person chose, or nothing when none is chosen. */
export const chosenArchitecture = (layout: Layout): StoredArchitecture | undefined => {
    const choice = loadChoice(layout.choiceArchitecture);
    const picked = choice?.picks[0]?.variant;
    return loadArchitectureVariants(layout).find((variant) => variant.name === picked);
};

/** What a domain's components job needs besides the architecture: what the domains it depends on already built. */
export const componentContext = (layout: Layout, jobs: Jobs, domain: string): ComponentContext | undefined => {
    const architecture = chosenArchitecture(layout);
    const found = architecture?.domains.find((each) => each.name === domain);
    if (architecture === undefined || found === undefined) return undefined;
    const base = designContext(layout);
    const available = found.dependsOn.flatMap(
        (name) =>
            outputOf<{ components: { name: string }[] }>(layout, `components-${slug(name)}`)?.components.map(
                (component) => component.name,
            ) ?? [],
    );
    void jobs;
    return { ...base, architecture, domain, available, relevant: relevantSteps(found, base.journeys) };
};

const drafts = (layout: Layout, stage: Stage, jobs: Jobs): Draft[] | string => {
    const request = loadRequest(layout);
    if (stage === "as-is") {
        if (!existsSync(layout.legacy)) return "the legacy sheet is missing: run `derive.ts legacy` first";
        const legacy = loadLegacy(layout);
        const made: Draft[] = [];
        for (const capability of legacy.capabilities) {
            const actions = Object.entries(legacy.actions).filter(([, action]) => action.owner === capability.id);
            if (actions.length === 0) continue;
            const rules = Object.entries(legacy.rules).filter(([, rule]) => rule.owner === capability.id);
            const surfaces = [...new Set(actions.map(([, action]) => action.surface))].sort();
            made.push({
                id: `tasks-${slug(capability.name)}`,
                kind: "tasks",
                title: `Find the tasks of ${capability.name}`,
                after: [],
                review: true,
                file: { kind: "tasks", actions: actions.map(([id]) => id), rules: rules.map(([id]) => id) },
                context: {
                    capability,
                    surfaces: surfaces.map((name) => ({
                        name: name === "" ? "entry points no window holds" : name,
                        bundle: join(layout.bundles, `screen-${slug(name)}--${slug(capability.name)}.md`),
                        actions: actions
                            .filter(([, action]) => action.surface === name)
                            .map(([id, action]) => ({
                                id,
                                what: action.what,
                                startedBy: action.startedBy,
                                rules: action.rules.filter((rule) => legacy.rules[rule]?.owner === capability.id),
                                place: action.place,
                            })),
                    })),
                    rules: rules.map(([id, rule]) => ({ id, statement: rule.statement, place: rule.place })),
                    entities: Object.entries(legacy.entities).map(([id, each]) => ({ id, ...each })),
                    externals: Object.entries(legacy.externals).map(([id, each]) => ({ id, ...each })),
                },
            });
        }
        made.push({
            id: "merge",
            kind: "merge",
            title: "Join the tasks that were written twice",
            after: made.map((draft) => draft.id),
            review: false,
            file: { kind: "merge", taskIds: [] },
            context: { tasks: [] },
        });
        return made;
    }
    if (stage === "journeys") {
        if (!confirmed(layout, "as-is"))
            return "the as-is is not confirmed (or changed since): run `choose.ts as-is` first";
        const essence = deriveEssence(
            loadLegacy(layout),
            loadTasks(layout),
            request,
            loadChoice(layout.choiceAsIs)?.marks ?? [],
        );
        writeJson(layout.essence, essence);
        const packs: (typeof essence.tasks)[] = [];
        let weight = 0;
        for (const task of essence.tasks) {
            const cost = task.actions.length + task.rules.length;
            if (packs.length === 0 || weight + cost > VARIANT_JOB_BUDGET) {
                packs.push([]);
                weight = 0;
            }
            packs.at(-1)?.push(task);
            weight += cost;
        }
        return packs.map((tasks, at) => ({
            id: `variants-${at + 1}`,
            kind: "variants" as const,
            title: `Design ways of doing tasks, part ${at + 1}`,
            after: [],
            review: true,
            file: { kind: "variants", tasks: tasks.map((task) => task.id) },
            context: { stack: essence.stack, notes: essence.notes, tasks },
        }));
    }
    if (stage === "architecture") {
        if (!existsSync(layout.journeys)) return "the journeys are not confirmed: run `choose.ts journeys` first";
        const essence = deriveEssence(
            loadLegacy(layout),
            loadTasks(layout),
            request,
            loadChoice(layout.choiceAsIs)?.marks ?? [],
        );
        writeJson(layout.essence, essence);
        return [
            {
                id: "shape",
                kind: "shape",
                title: "Design the architecture",
                after: [],
                review: true,
                file: { kind: "shape" },
                context: {
                    stack: essence.stack,
                    notes: essence.notes,
                    // The entry points are not needed to cut the system: the rules, data and needs are.
                    tasks: essence.tasks.map(({ actions: _actions, ...task }) => task),
                    journeys: loadJourneys(layout).map((journey) => ({
                        id: journey.id,
                        task: journey.task,
                        name: journey.name,
                        steps: journey.steps.map((step) => ({
                            id: step.id,
                            intent: step.intent,
                            system: step.system,
                            touches: step.touches,
                            honours: step.honours,
                            keeps: step.link._tag === "legacy" ? step.link.keeps : [],
                        })),
                    })),
                    needs: needsOf(loadTasks(layout)).map((id) => ({
                        id,
                        name: loadLegacy(layout).externals[id]?.name ?? "",
                    })),
                },
            },
        ];
    }
    const architecture = chosenArchitecture(layout);
    if (architecture === undefined || !confirmed(layout, "architecture"))
        return "no architecture is chosen (or it changed since): run `choose.ts architecture` first";
    const base = designContext(layout);
    const legacyRules = base.legacy.rules;
    return architecture.domains.map((domain) => ({
        id: `components-${slug(domain.name)}`,
        kind: "components" as const,
        title: `Design the components of ${domain.name}`,
        after: domain.dependsOn.map((name) => `components-${slug(name)}`),
        review: false,
        file: { kind: "components", domain: domain.name },
        context: {
            stack: request.stack,
            domain,
            container: architecture.containers.find(
                (container) => container.kind !== "store" && container.holds.includes(domain.name),
            ),
            integrations: architecture.integrations
                .filter((each) => each.domain === domain.name)
                .map((each) => ({ ...each, name: base.legacy.externals[each.need]?.name ?? "" })),
            rules: domain.rules.map((id) => ({ id, statement: legacyRules[id]?.statement ?? "" })),
            steps: base.journeys.flatMap((journey) =>
                journey.steps
                    .filter((step) => relevantSteps(domain, [journey]).includes(step.id))
                    .map((step) => ({
                        id: step.id,
                        intent: step.intent,
                        system: step.system,
                        touches: step.touches,
                        honours: step.honours,
                    })),
            ),
            available: [],
        },
    }));
};

/**
 * Makes the jobs of a stage, with their input files. Deterministic: the same files give the same jobs.
 * @param layout the run's folders
 * @param stage the stage
 * @returns what was prepared, or why it could not be
 */
export const prepare = (layout: Layout, stage: Stage): string => {
    const jobs = loadJobs(layout);
    if (jobs.batch?.jobs.some((entry) => !entry.reported)) return "a batch is still open: report its agents first";
    jobs.batch = undefined;
    const made = drafts(layout, stage, jobs);
    if (typeof made === "string") return made;
    for (const draft of made) {
        const paths = jobPaths(layout, draft.id);
        writeJson(paths.job, draft.file);
        writeJson(paths.context, draft.context);
    }
    const fresh: Job[] = made.map((draft) => ({
        id: draft.id,
        stage,
        kind: draft.kind,
        title: draft.title,
        after: draft.after,
        review: draft.review,
        state: "toRun",
        fixes: 0,
        feedback: "",
        disputes: [],
    }));
    saveJobs(layout, { ...jobs, jobs: [...jobs.jobs.filter((job) => job.stage !== stage), ...fresh] });
    return `${fresh.length} jobs prepared for ${stage}`;
};

/**
 * A job's inputs name what earlier jobs decided, which did not exist when the stage was prepared. Called when a job is
 * handed out, it patches the job and context files with what is accepted by then.
 */
export const refreshInputs = (layout: Layout, jobs: Jobs, id: string) => {
    const job = jobs.jobs.find((each) => each.id === id);
    if (job === undefined) return;
    const paths = jobPaths(layout, id);
    if (job.kind === "merge") {
        const tasks = acceptedTasks(layout, jobs);
        writeJson(paths.job, { kind: "merge", taskIds: tasks.map((task) => task.id) });
        writeJson(paths.context, {
            tasks: tasks.map((task) => ({
                id: task.id,
                outcome: task.outcome,
                actor: task.actor,
                actions: task.actions.length,
                rules: task.rules.length,
            })),
        });
    }
    if (job.kind === "components") {
        const file = readJson<JobFile>(paths.job);
        const context = componentContext(layout, jobs, file.domain ?? "");
        writeJson(paths.context, {
            ...readJson<Record<string, unknown>>(paths.context),
            available: context?.available ?? [],
        });
    }
};
