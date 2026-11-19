import { capabilityBundle, screenBundle } from "../../../../skills/code-analysis/shared/read/bundle";
import { copy } from "./copy";
import type { BundleIndex, Capability, Knowledge, System } from "./types";

type Held = ReturnType<typeof screenBundle>;

/**
 * What the bundle of a screen holds, as the analysis tool that builds it will: the same function, so the page and the
 * tool cannot differ.
 * @param system the system payload
 * @param capabilities every capability payload
 * @param knowledge what the analysis knows of the system as a whole
 * @param index the bundle payload: the code blocks and rules the analysis indexed
 * @param key the screen's address
 * @returns the bundle, or none
 */
export const bundleOfScreen = (
    system: System,
    capabilities: readonly Capability[],
    knowledge: Knowledge,
    index: BundleIndex,
    key: string,
): Held => screenBundle({ system, capabilities, knowledge, index } as never, key);

/**
 * What the bundle of a capability holds.
 * @param system the system payload
 * @param capabilities every capability payload
 * @param knowledge what the analysis knows of the system as a whole
 * @param index the bundle payload: the code blocks and rules the analysis indexed
 * @param id the capability's id
 * @returns the bundle, or none
 */
export const bundleOfCapability = (
    system: System,
    capabilities: readonly Capability[],
    knowledge: Knowledge,
    index: BundleIndex,
    id: string,
): Held => capabilityBundle({ system, capabilities, knowledge, index } as never, id);

/**
 * The command that builds a bundle, as the page offers it to copy: the one the build was given in `BUILD_BUNDLE` (the
 * conductor names the analysis folder and the tool's full path), else the analysis tool's own with a placeholder for
 * the folder.
 * @param args what to bundle, such as `capability "<name>"` or `screen`
 * @param run the command the build was given; `BUILD_BUNDLE` by default
 * @returns the command line
 */
export const bundleCommand = (args: string, run: string | undefined = process.env.BUILD_BUNDLE): string =>
    run === undefined || run.trim() === ""
        ? `cd .agents/skills/code-analysis && CODE_ANALYSIS_ROOT=${copy.bundle.place} bun cli/build-bundle.ts ${args}`
        : `${run.trim()} ${args}`;
