import { join } from "node:path";
import type { Kind } from "./documents";
import { profileOfKind } from "./workflows";
import { skillFolder } from "./run-layout";

/**
 * The path of the profile file for a kind of work, as the agents are told it.
 * @param kind the kind of work
 * @returns the path
 */
export const profilePathOf = (kind: Kind) => join(skillFolder, "profiles", `${profileOfKind(kind)}.md`);

/** The addendum a workflow with a legacy attachment adds to its profile: the rules for reading the attachment. */
export const referenceProfilePath = join(skillFolder, "profiles", "modernize.md");
