import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { payloadContractVersion } from "../../code-analysis/shared/model/schemas/payload-manifest";
import type { Paths } from "./steps";

/** The note that names where the analysis's store is, when it was made somewhere other than the Output Root. */
export const locationNote = (paths: Paths) => join(paths.analysis, "analysis.location.json");

/**
 * The folder that holds the analysis's store: the Output Root's own, or the one its note names.
 * @param paths the run's folders
 * @returns the folder, or nothing when the store cannot be found
 */
export const analysisStoreOf = (paths: Paths): string | undefined => {
    if (existsSync(join(paths.analysis, "analysis.sqlite"))) return paths.analysis;
    if (!existsSync(locationNote(paths))) return undefined;
    try {
        const root = (JSON.parse(readFileSync(locationNote(paths), "utf8")) as { root?: string }).root;
        return root !== undefined && existsSync(join(root, "analysis.sqlite")) ? root : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Why the payloads cannot be read by these scripts: none were written, or they follow another contract version.
 * @param paths the run's folders
 * @returns the problems, empty when they can
 */
export const payloadProblems = (paths: Paths): string[] => {
    const manifest = join(paths.payloads, "manifest.json");
    if (!existsSync(manifest))
        return ["the payloads have no manifest: they were written before payloads were versioned"];
    try {
        const version = (JSON.parse(readFileSync(manifest, "utf8")) as { contractVersion?: number }).contractVersion;
        return version === payloadContractVersion
            ? []
            : [
                  `the payloads follow contract version ${version}, and these scripts read version ${payloadContractVersion}`,
              ];
    } catch {
        return ["the payloads' manifest cannot be read"];
    }
};

/**
 * Why today's tasks cannot be read from the analysis, or nothing. A decision already confirmed is not blocked: it keeps
 * the tasks it was confirmed on.
 * @param paths the run's folders
 * @returns the message that stops the step
 */
export const journeysGuard = (paths: Paths): string | undefined =>
    existsSync(paths.journeysToday) || existsSync(paths.choiceAsIs)
        ? undefined
        : `the analysis holds no journeys of today (payloads/journeys.json): run the code-analysis Publish stage again so its journeys jobs write them, then write the payloads (\`CODE_ANALYSIS_ROOT=<the folder with analysis.sqlite> bun <code-analysis>/cli/write-payloads.ts\`), then call next`;
