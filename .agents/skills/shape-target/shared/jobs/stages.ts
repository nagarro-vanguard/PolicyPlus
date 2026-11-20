import { existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { relevantSteps, type ComponentContext, type DesignContext } from "../derive/checks";
import { deriveEssence } from "../derive/essence";
import { evidenceOf } from "../derive/evidence";
import { confirmed } from "../gates";
import { slug } from "../model/ids";
import type { Layout } from "../model/layout";
import type { Architecture, StoredArchitecture } from "../model/records";
import {
    loadArchitectureVariants,
    loadChoice,
    loadJourneys,
    loadLegacy,
    loadRequest,
    loadTasks,
    needsOf,
} from "../run";
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
                            ...(step.changes === undefined ? {} : { changes: step.changes }),
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
            rules: domain.rules.map((id) => {
                const to = base.journeys
                    .flatMap((journey) => journey.steps.flatMap((step) => step.changes ?? []))
                    .find((change) => change.rule === id)?.to;
                return { id, statement: legacyRules[id]?.statement ?? "", ...(to === undefined ? {} : { to }) };
            }),
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
    // What an earlier run left for these jobs is put aside, so a writer starts from the context and never from an old draft.
    const archive = join(layout.work, "archive", new Date().toISOString().replaceAll(":", "-"));
    for (const draft of made) {
        const paths = jobPaths(layout, draft.id);
        for (const old of [paths.output, paths.review])
            if (existsSync(old)) {
                mkdirSync(archive, { recursive: true });
                renameSync(old, join(archive, old.slice(old.lastIndexOf("/") + 1)));
            }
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
    if (job.kind === "shape") {
        const written = outputOf<{ architectures?: unknown }>(layout, "shape")?.architectures;
        if (Array.isArray(written))
            try {
                writeJson(paths.context, {
                    ...readJson<Record<string, unknown>>(paths.context),
                    evidence: evidenceOf(written as Architecture[], loadJourneys(layout)),
                });
            } catch {
                // An output that does not match its shape has no figures yet; the writer's own check says why.
            }
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
