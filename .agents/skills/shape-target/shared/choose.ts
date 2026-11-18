import type { Layout } from "./model/layout";
import type { Choice, Mark } from "./model/records";
import { finalGaps } from "./derive/checks";
import { gateState, upstreamOf, type Gate } from "./gates";
import { loadArchitecture, loadArchitectureVariants, loadJourneyVariants, loadTasks } from "./run";
import { designContext } from "./jobs/stages";
import { writeJson } from "./jobs/state";

export type Chosen = { ok: boolean; text: string };

const stamp = () => new Date().toISOString();

/** Why a decision cannot be recorded now, or nothing when it can. */
const refusal = (layout: Layout, gate: Gate): string | undefined => {
    const state = gateState(layout, gate);
    return state === "not made"
        ? `nothing to confirm yet: finish the ${gate} stage first`
        : state === "blocked"
          ? `${upstreamOf(gate)} is not confirmed (or changed since): confirm it first`
          : undefined;
};

/**
 * Confirms the as-is. A `wrong` mark blocks it, and marks of steps that no longer exist are dropped and named.
 * @param layout the run's folders
 * @param marks the person's marks
 * @param reason why they confirm
 * @returns whether it was confirmed, and what to do otherwise
 */
export const chooseAsIs = (layout: Layout, marks: readonly Mark[], reason: string): Chosen => {
    const tasks = loadTasks(layout);
    if (tasks.length === 0)
        return { ok: false, text: "there is no current journey to confirm: finish the as-is stage first" };
    const refused = refusal(layout, "as-is");
    if (refused !== undefined) return { ok: false, text: refused };
    const valid = (mark: Mark) => {
        const at = mark.of.lastIndexOf("#");
        const task = tasks.find((each) => each.id === mark.of.slice(0, at));
        return (
            task !== undefined &&
            Number(mark.of.slice(at + 1)) >= 1 &&
            Number(mark.of.slice(at + 1)) <= task.current.length
        );
    };
    const dropped = marks.filter((mark) => !valid(mark));
    const kept = marks.filter(valid);
    const wrong = kept.filter((mark) => mark.verdict === "wrong");
    if (wrong.length > 0)
        return {
            ok: false,
            text: `${wrong.length} steps are marked wrong: run \`prepare as-is\` again with these as instructions, then confirm:\n${wrong.map((mark) => `- ${mark.of}: ${mark.note ?? ""}`).join("\n")}`,
        };
    const choice: Choice = { decision: "as-is", picks: [], reason, confirmedAt: stamp(), marks: kept };
    writeJson(layout.choiceAsIs, choice);
    return {
        ok: true,
        text: `as-is confirmed with ${kept.length} marks${dropped.length > 0 ? `; dropped ${dropped.length} marks of steps that no longer exist: ${dropped.map((mark) => mark.of).join(", ")}` : ""}`,
    };
};

/**
 * Confirms the journeys: one variant per task, by the recommendation or by name.
 * @param layout the run's folders
 * @param picks `task id` to variant name; tasks missing from it take the recommended variant when `recommended` is set
 * @param recommended take the recommended variant of every task not named
 * @param reason why they confirm
 * @returns whether it was confirmed
 */
export const chooseJourneys = (
    layout: Layout,
    picks: Readonly<Record<string, string>>,
    recommended: boolean,
    reason: string,
): Chosen => {
    const variants = loadJourneyVariants(layout);
    const tasks = loadTasks(layout);
    if (variants.length === 0)
        return { ok: false, text: "there are no journey variants: finish the journeys stage first" };
    const refused = refusal(layout, "journeys");
    if (refused !== undefined) return { ok: false, text: refused };
    const chosen: (typeof variants)[number][] = [];
    const gaps: string[] = [];
    for (const task of tasks) {
        const name = picks[task.id];
        const found =
            name !== undefined
                ? variants.find((variant) => variant.task === task.id && variant.name === name)
                : recommended
                  ? variants.find((variant) => variant.task === task.id && variant.recommended !== undefined)
                  : undefined;
        if (found === undefined)
            gaps.push(`task ${task.id} has no chosen variant${name !== undefined ? ` (no variant "${name}")` : ""}`);
        else chosen.push(found);
    }
    for (const task of Object.keys(picks)) if (!tasks.some((each) => each.id === task)) gaps.push(`no task ${task}`);
    if (gaps.length > 0) return { ok: false, text: gaps.join("\n") };
    writeJson(layout.journeys, chosen);
    const choice: Choice = {
        decision: "journeys",
        picks: chosen.map((variant) => ({ of: variant.task, variant: variant.name })),
        reason,
        confirmedAt: stamp(),
    };
    writeJson(layout.choiceJourneys, choice);
    return { ok: true, text: `${chosen.length} journeys confirmed, one for each task` };
};

export const chooseArchitecture = (layout: Layout, name: string, reason: string): Chosen => {
    const refused = refusal(layout, "architecture");
    if (refused !== undefined) return { ok: false, text: refused };
    const variants = loadArchitectureVariants(layout);
    if (!variants.some((variant) => variant.name === name))
        return {
            ok: false,
            text: `no architecture "${name}"; the variants are ${variants.map((variant) => `"${variant.name}"`).join(", ")}`,
        };
    const choice: Choice = {
        decision: "architecture",
        picks: [{ of: "architecture", variant: name }],
        reason,
        confirmedAt: stamp(),
    };
    writeJson(layout.choiceArchitecture, choice);
    return { ok: true, text: `architecture "${name}" confirmed` };
};

/**
 * Confirms the components of the chosen architecture, as the checks passed them in `target/architecture.json`.
 * @param layout the run's folders
 * @param reason why they confirm
 * @returns whether it was confirmed
 */
export const chooseComponents = (layout: Layout, reason: string): Chosen => {
    const refused = refusal(layout, "components");
    if (refused !== undefined) return { ok: false, text: refused };
    const architecture = loadArchitecture(layout);
    if (architecture === undefined)
        return { ok: false, text: "there are no components: finish the components stage first" };
    const gaps = finalGaps(architecture, designContext(layout));
    if (gaps.length > 0) return { ok: false, text: gaps.map((gap) => `- ${gap}`).join("\n") };
    const choice: Choice = {
        decision: "components",
        picks: [{ of: "components", variant: architecture.name }],
        reason,
        confirmedAt: stamp(),
    };
    writeJson(layout.choiceComponents, choice);
    return { ok: true, text: `${architecture.components?.length ?? 0} components of "${architecture.name}" confirmed` };
};
