import { capabilityBundle, screenBundle } from "../../../../skills/code-analysis/shared/read/bundle";
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
