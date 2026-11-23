import { copyFileSync, mkdirSync } from "node:fs";
import type { Layout } from "./model/layout";
import type { Choice, Dispute } from "./model/records";
import { finalGaps } from "./derive/checks";
import { loadDisputes } from "./disputes";
import { gateState, proposalOf, recordOf, snapshotOf, subjectOf, upstreamOf, type Gate } from "./gates";
import { writeManifest } from "./manifest";
import { loadArchitecture, loadArchitectureVariants, loadJourneyVariants, loadTasks } from "./run";
import { designContext } from "./jobs/stages";
import { writeJson } from "./jobs/state";

export type Decided = { ok: boolean; text: string };

const stamp = () => new Date().toISOString();

/**
 * Records a decision: the hash of what it was made about, and a copy of that file as it stood, so what changed since
 * can be found by comparing the two.
 * @param layout the run's folders
 * @param gate the decision
 * @param choice what was decided, without the hash
 */
const record = (layout: Layout, gate: Gate, choice: Omit<Choice, "subject">) => {
    const proposal = proposalOf(layout, gate);
    mkdirSync(layout.confirmed, { recursive: true });
    copyFileSync(proposal, snapshotOf(layout, gate));
    writeJson(recordOf(layout, gate), { ...choice, subject: subjectOf(proposal) } satisfies Choice);
    writeManifest(layout);
};

/** Why a decision cannot be recorded now, or nothing when it can. */
const refusal = (layout: Layout, gate: Gate): string | undefined => {
    const state = gateState(layout, gate);
    return state === "not made"
        ? `nothing to decide yet: ${gate === "as-is" ? "run `derive.ts current`" : `finish the ${gate} stage`} first`
        : state === "blocked"
          ? `${upstreamOf(gate)} is not decided (or changed since): decide it first`
          : undefined;
};

/**
 * Today's tasks are the analysis's journeys; they are taken as they are.
 * @param layout the run's folders
 * @returns whether it was decided
 */
const decideAsIs = (layout: Layout): Decided => {
    const tasks = loadTasks(layout);
    if (tasks.length === 0)
        return {
            ok: false,
            text: "there is no current journey to decide on: run `derive.ts current` first, which reads the analysis's journeys",
        };
    const refused = refusal(layout, "as-is");
    if (refused !== undefined) return { ok: false, text: refused };
    record(layout, "as-is", {
        decision: "as-is",
        picks: [],
        reason: `Today's ${tasks.length} tasks are taken as the code analysis wrote them.`,
        confirmedAt: stamp(),
    });
    return { ok: true, text: `as-is decided: ${tasks.length} tasks` };
};

/**
 * Picks the variant to take among those of one subject, the same way every time: the recommended one, else the first
 * in the order the stage wrote them. Challenges still open on it do not change the pick; they are kept in the decision.
 * @param variants the variants of one subject, in the order written
 * @param recommended whether a variant is the recommended one
 * @returns the variant to take
 */
const pickOf = <V>(variants: readonly V[], recommended: (variant: V) => boolean) =>
    variants.find(recommended) ?? variants[0];

/**
 * Decides the journeys: one variant for each task.
 * @param layout the run's folders
 * @returns whether it was decided
 */
const decideJourneys = (layout: Layout): Decided => {
    const variants = loadJourneyVariants(layout);
    if (variants.length === 0)
        return { ok: false, text: "there are no journey variants: finish the journeys stage first" };
    const refused = refusal(layout, "journeys");
    if (refused !== undefined) return { ok: false, text: refused };
    const disputes = loadDisputes(layout, "journeys");
    const chosen: (typeof variants)[number][] = [];
    for (const task of loadTasks(layout)) {
        const found = pickOf(
            variants.filter((variant) => variant.task === task.id),
            (variant) => variant.recommended !== undefined,
        );
        if (found === undefined) return { ok: false, text: `task ${task.id} has no journey variant` };
        chosen.push(found);
    }
    const ids = new Set(chosen.map((variant) => variant.id));
    const open: Dispute[] = disputes.filter((each) => ids.has(each.variant));
    writeJson(layout.journeys, chosen);
    record(layout, "journeys", {
        decision: "journeys",
        picks: chosen.map((variant) => ({ of: variant.task, variant: variant.name, id: variant.id })),
        reason: `The recommended way of doing each of ${chosen.length} tasks; ${open.length} challenges of the reviewer stay open on what was taken.`,
        confirmedAt: stamp(),
        ...(open.length > 0 ? { acceptedDisputes: open } : {}),
    });
    return {
        ok: true,
        text: `${chosen.length} journeys decided, one for each task; ${open.length} challenges stay open`,
    };
};

/**
 * Decides the architecture.
 * @param layout the run's folders
 * @returns whether it was decided
 */
const decideArchitecture = (layout: Layout): Decided => {
    const refused = refusal(layout, "architecture");
    if (refused !== undefined) return { ok: false, text: refused };
    const variants = loadArchitectureVariants(layout);
    const disputes = loadDisputes(layout, "architecture");
    const found = pickOf(variants, (variant) => variant.recommended !== undefined);
    if (found === undefined)
        return { ok: false, text: "there are no architecture variants: finish the architecture stage first" };
    const open = disputes.filter((each) => each.variant === found.name);
    record(layout, "architecture", {
        decision: "architecture",
        picks: [{ of: "architecture", variant: found.name }],
        reason: `${found.recommended === undefined ? "The first variant" : "The recommended variant"} of ${variants.length}; ${open.length} challenges of the reviewer stay open on it.`,
        confirmedAt: stamp(),
        ...(open.length > 0 ? { acceptedDisputes: open } : {}),
    });
    return { ok: true, text: `architecture "${found.name}" decided; ${open.length} challenges stay open` };
};

/**
 * Decides the components of the chosen architecture, as the checks passed them in `target/architecture.json`.
 * @param layout the run's folders
 * @returns whether it was decided
 */
const decideComponents = (layout: Layout): Decided => {
    const refused = refusal(layout, "components");
    if (refused !== undefined) return { ok: false, text: refused };
    const architecture = loadArchitecture(layout);
    if (architecture === undefined)
        return { ok: false, text: "there are no components: finish the components stage first" };
    const gaps = finalGaps(architecture, designContext(layout));
    if (gaps.length > 0) return { ok: false, text: gaps.map((gap) => `- ${gap}`).join("\n") };
    record(layout, "components", {
        decision: "components",
        picks: [{ of: "components", variant: architecture.name }],
        reason: `Every check across the chosen architecture passes for its ${architecture.components?.length ?? 0} components.`,
        confirmedAt: stamp(),
    });
    return { ok: true, text: `${architecture.components?.length ?? 0} components of "${architecture.name}" decided` };
};

/**
 * Decides one of the four decisions.
 * @param layout the run's folders
 * @param gate the decision
 * @returns whether it was decided
 */
export const decide = (layout: Layout, gate: Gate): Decided =>
    gate === "as-is"
        ? decideAsIs(layout)
        : gate === "journeys"
          ? decideJourneys(layout)
          : gate === "architecture"
            ? decideArchitecture(layout)
            : decideComponents(layout);
