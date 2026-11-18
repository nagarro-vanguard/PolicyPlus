import { join } from "node:path";

/** The one git-ignored folder, at the codebase root, under which every skill keeps its runs. */
export const artifactsRoot = ".artifacts";

/**
 * The folder one skill keeps its runs in, `.artifacts/<skill>`.
 * @param skill the skill's name, such as `shape-and-deliver`
 * @returns the folder, relative to the codebase root
 */
export const artifactsOf = (skill: string) => join(artifactsRoot, skill);

/** The one folder of a run that is not for a reader: agents' inputs and outputs, state, drafts, assets. */
export const internalFolder = "internal";

/**
 * A path inside a run's internal folder.
 * @param run the run folder
 * @param parts the path below it
 * @returns the path
 */
export const internalPath = (run: string, ...parts: readonly string[]) => join(run, internalFolder, ...parts);
