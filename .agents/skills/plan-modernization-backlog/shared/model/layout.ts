import { join } from "node:path";

/**
 * Where everything of a run lives under the Output Root. The layout is fixed, as code-analysis's is; only the root is
 * the person's to choose.
 * @param outputRoot the request's Output Root
 * @returns every folder and file the skills agree on
 */
export const layoutOf = (outputRoot: string) => {
    const backlog = join(outputRoot, ".modernization-backlog");
    const items = join(outputRoot, "work-items");
    return {
        outputRoot,
        analysis: join(outputRoot, ".code-analysis"),
        analysisPayloads: join(outputRoot, ".code-analysis", "payloads"),
        analysisBundles: join(outputRoot, ".code-analysis", "bundles"),
        backlog,
        work: join(backlog, "work"),
        requestJson: join(outputRoot, "request.json"),
        jobs: join(backlog, "work", "jobs.json"),
        records: join(backlog, "work", "records"),
        payloads: join(backlog, "payloads"),
        plan: join(backlog, "payloads", "plan.json"),
        items,
        manifest: join(items, "manifest.json"),
        bodies: join(items, "bodies"),
        attachments: join(items, "attachments"),
        results: join(items, "results"),
        agentsFiles: join(items, "agents-md"),
        target: join(outputRoot, "target"),
        targetJourneys: join(outputRoot, "target", "journeys.json"),
        targetArchitecture: join(outputRoot, "target", "architecture.json"),
        targetTasks: join(outputRoot, "target", "current.json"),
        app: join(outputRoot, "app"),
        state: join(outputRoot, "state.json"),
    };
};

export type Layout = ReturnType<typeof layoutOf>;
