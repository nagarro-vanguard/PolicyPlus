import { join } from "node:path";

/**
 * Where everything of a run lives under the Output Root. The layout is fixed, as code-analysis's is; only the root is
 * the person's to choose.
 * @param outputRoot the request's Output Root
 * @returns every folder and file the skills agree on
 */
export const layoutOf = (outputRoot: string) => {
    const work = join(outputRoot, ".shape-target", "work");
    const target = join(outputRoot, "target");
    const records = join(work, "records");
    return {
        outputRoot,
        requestJson: join(outputRoot, "request.json"),
        payloads: join(outputRoot, ".code-analysis", "payloads"),
        bundles: join(outputRoot, ".code-analysis", "bundles"),
        work,
        jobs: join(work, "jobs.json"),
        records,
        tasksRecord: join(records, "tasks.json"),
        journeyVariants: join(records, "journey-variants.json"),
        architectureVariants: join(records, "architecture-variants.json"),
        target,
        legacy: join(target, "legacy.json"),
        current: join(target, "current.json"),
        essence: join(target, "essence.json"),
        choiceAsIs: join(target, "choice-as-is.json"),
        choiceJourneys: join(target, "choice-journeys.json"),
        choiceArchitecture: join(target, "choice-architecture.json"),
        choiceComponents: join(target, "choice-components.json"),
        journeys: join(target, "journeys.json"),
        architecture: join(target, "architecture.json"),
        schemas: join(outputRoot, ".shape-target", "payloads", "schema"),
    };
};

export type Layout = ReturnType<typeof layoutOf>;
