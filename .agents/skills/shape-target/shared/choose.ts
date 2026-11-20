import { copyFileSync, mkdirSync } from "node:fs";
import type { Layout } from "./model/layout";
import type { Choice, Dispute, Mark } from "./model/records";
import { finalGaps } from "./derive/checks";
import { loadDisputes } from "./disputes";
import { gateState, proposalOf, recordOf, snapshotOf, subjectOf, upstreamOf, type Gate } from "./gates";
import { writeManifest } from "./manifest";
import { loadArchitecture, loadArchitectureVariants, loadJourneyVariants, loadTasks } from "./run";
import { designContext } from "./jobs/stages";
import { writeJson } from "./jobs/state";

export type Chosen = { ok: boolean; text: string };

const stamp = () => new Date().toISOString();

/**
 * Records a decision: the hash of what it was made about, and a copy of that file as it stood, so what changed since
 * can be found by comparing the two.
 * @param layout the run's folders
 * @param gate the decision
 * @param choice what the person decided, without the hash
 */
const record = (layout: Layout, gate: Gate, choice: Omit<Choice, "subject">) => {
    const proposal = proposalOf(layout, gate);
    mkdirSync(layout.confirmed, { recursive: true });
    copyFileSync(proposal, snapshotOf(layout, gate));
    writeJson(recordOf(layout, gate), { ...choice, subject: subjectOf(proposal) } satisfies Choice);
    writeManifest(layout);
};

/** The fewest words of a reason that can stand for accepting open challenges: a word of assent is not a reason. */
const MIN_REASON_WORDS = 8;

/**
 * The challenges still open on what is picked, which the person must have read and accepted, with a reason in their
 * own words, before it is confirmed.
 * @param open the disputes about the picked variants
 * @param accepted whether the person accepted them
 * @param reason the reason they gave
 * @returns why it is refused, or nothing when it may go ahead
 */
const disputed = (open: readonly Dispute[], accepted: boolean, reason: string): string | undefined => {
    if (open.length === 0) return undefined;
    const list = open.map((each) => `- ${each.variant}: ${each.says}`).join("\n");
    if (!accepted)
        return `${open.length} challenges of the reviewer are still open on what is picked. Show them to the person; confirm again with --accept-disputes and a --reason of the person's own words that says why they accept them, or pick another variant:\n${list}`;
    if (reason.trim().split(/\s+/).length < MIN_REASON_WORDS)
        return `accepting ${open.length} open challenges needs a --reason of at least ${MIN_REASON_WORDS} words that says why the person accepts them:\n${list}`;
    return undefined;
};

/** Why a decision cannot be recorded now, or nothing when it can. */
const refusal = (layout: Layout, gate: Gate): string | undefined => {
    const state = gateState(layout, gate);
    return state === "not made"
        ? `nothing to confirm yet: ${gate === "as-is" ? "run `derive.ts current`" : `finish the ${gate} stage`} first`
        : state === "blocked"
          ? `${upstreamOf(gate)} is not confirmed (or changed since): confirm it first`
          : undefined;
};

/**
 * Confirms the as-is, the analysis's journeys of today. A `wrong` mark blocks it, and marks of steps that no longer exist are dropped and named.
 * @param layout the run's folders
 * @param marks the person's marks
 * @param reason why they confirm
 * @returns whether it was confirmed, and what to do otherwise
 */
export const chooseAsIs = (layout: Layout, marks: readonly Mark[], reason: string): Chosen => {
    const tasks = loadTasks(layout);
    if (tasks.length === 0)
        return {
            ok: false,
            text: "there is no current journey to confirm: run `derive.ts current` first, which reads the analysis's journeys",
        };
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
            text: `${wrong.length} steps are marked wrong: ask the analysis for its journeys again with these as instructions (a request for changes at this decision does it), then confirm:\n${wrong.map((mark) => `- ${mark.of}: ${mark.note ?? ""}`).join("\n")}`,
        };
    record(layout, "as-is", { decision: "as-is", picks: [], reason, confirmedAt: stamp(), marks: kept });
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
 * @param acceptDisputes the person has seen the challenges still open on the picked variants and accepts them
 * @returns whether it was confirmed
 */
export const chooseJourneys = (
    layout: Layout,
    picks: Readonly<Record<string, string>>,
    recommended: boolean,
    reason: string,
    acceptDisputes = false,
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
    const ids = new Set(chosen.map((variant) => variant.id));
    const open = loadDisputes(layout, "journeys").filter((each) => ids.has(each.variant));
    const refusedForDisputes = disputed(open, acceptDisputes, reason);
    if (refusedForDisputes !== undefined) return { ok: false, text: refusedForDisputes };
    writeJson(layout.journeys, chosen);
    record(layout, "journeys", {
        decision: "journeys",
        picks: chosen.map((variant) => ({ of: variant.task, variant: variant.name, id: variant.id })),
        reason,
        confirmedAt: stamp(),
        ...(open.length > 0 ? { acceptedDisputes: open } : {}),
    });
    return { ok: true, text: `${chosen.length} journeys confirmed, one for each task` };
};

/**
 * Confirms one architecture by name.
 * @param layout the run's folders
 * @param name the variant's name
 * @param reason why they confirm
 * @param acceptDisputes the person has seen the challenges still open on it and accepts them
 * @returns whether it was confirmed
 */
export const chooseArchitecture = (layout: Layout, name: string, reason: string, acceptDisputes = false): Chosen => {
    const refused = refusal(layout, "architecture");
    if (refused !== undefined) return { ok: false, text: refused };
    const variants = loadArchitectureVariants(layout);
    if (!variants.some((variant) => variant.name === name))
        return {
            ok: false,
            text: `no architecture "${name}"; the variants are ${variants.map((variant) => `"${variant.name}"`).join(", ")}`,
        };
    const open = loadDisputes(layout, "architecture").filter((each) => each.variant === name);
    const refusedForDisputes = disputed(open, acceptDisputes, reason);
    if (refusedForDisputes !== undefined) return { ok: false, text: refusedForDisputes };
    record(layout, "architecture", {
        decision: "architecture",
        picks: [{ of: "architecture", variant: name }],
        reason,
        confirmedAt: stamp(),
        ...(open.length > 0 ? { acceptedDisputes: open } : {}),
    });
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
    record(layout, "components", {
        decision: "components",
        picks: [{ of: "components", variant: architecture.name }],
        reason,
        confirmedAt: stamp(),
    });
    return { ok: true, text: `${architecture.components?.length ?? 0} components of "${architecture.name}" confirmed` };
};
