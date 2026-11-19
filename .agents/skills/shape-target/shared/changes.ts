import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { gates, gateState, proposalOf, recordOf, subjectOf, type Gate } from "./gates";
import { writeManifest } from "./manifest";
import { redo } from "./jobs/driver";
import type { JobFile } from "./jobs/gates";
import { jobPaths, loadJobs, readJson, writeJson } from "./jobs/state";
import { slug } from "./model/ids";
import type { Layout } from "./model/layout";

export type Scope = { task?: string; domain?: string };
export type ChangeRequest = {
    gate: Gate;
    text: string;
    scope: Scope;
    requestedAt: string;
    /** The hash of the proposal the person was looking at. */
    subject: string | undefined;
    applied: boolean;
};

export const changesPath = (layout: Layout, gate: Gate) => join(layout.records, `changes-${gate}.json`);

/** The copy in `target/` that a confirmation wrote, which goes with it. */
const copyOf = (layout: Layout, gate: Gate) => (gate === "journeys" ? layout.journeys : undefined);

/** Every request for changes made at a gate, oldest first. */
export const changeHistory = (layout: Layout, gate: Gate): ChangeRequest[] =>
    existsSync(changesPath(layout, gate)) ? readJson<ChangeRequest[]>(changesPath(layout, gate)) : [];

/** The request not yet handed to the jobs, if any. */
export const pendingChange = (layout: Layout, gate: Gate) => changeHistory(layout, gate).find((each) => !each.applied);

/**
 * Records that the person wants changes at a gate: the confirmation is withdrawn, so every gate after it is blocked.
 * @param layout the run's folders
 * @param gate the decision
 * @param text what to change, in the person's words
 * @param scope the task or domain it is about; empty for the whole decision
 * @returns whether it was recorded, and what happens next
 */
export const requestChanges = (
    layout: Layout,
    gate: Gate,
    text: string,
    scope: Scope,
): { ok: boolean; text: string } => {
    if (text.trim() === "") return { ok: false, text: "say what to change" };
    if (gateState(layout, gate) === "not made")
        return { ok: false, text: `nothing to change yet: finish the ${gate} stage first` };
    const proposal = proposalOf(layout, gate);
    writeJson(changesPath(layout, gate), [
        ...changeHistory(layout, gate),
        {
            gate,
            text,
            scope,
            requestedAt: new Date().toISOString(),
            subject: subjectOf(proposal),
            applied: false,
        } satisfies ChangeRequest,
    ]);
    for (const path of [recordOf(layout, gate), copyOf(layout, gate)])
        if (path !== undefined) rmSync(path, { force: true });
    writeManifest(layout);
    const after = gates.slice(gates.indexOf(gate) + 1);
    return {
        ok: true,
        text: `changes recorded; the ${gate} confirmation is withdrawn${after.length > 0 ? `, so ${after.join(", ")} wait until it is confirmed again` : ""}. Next: \`stage.ts apply-changes ${gate}\`, drive the jobs it hands back, \`stage.ts finish ${gate}\`, then ask the person again.`,
    };
};

/** The ids of the jobs of a gate that the request is about. */
const jobsFor = (layout: Layout, gate: Exclude<Gate, "as-is">, scope: Scope): string[] => {
    const jobs = loadJobs(layout).jobs.filter((job) => job.stage === gate);
    const named = (domain: string) => domain.split(",").map((each) => slug(each.trim()));
    if (gate === "journeys")
        return jobs
            .filter(
                (job) =>
                    job.kind === "variants" &&
                    (scope.task === undefined ||
                        (readJson<JobFile>(jobPaths(layout, job.id).job).tasks ?? []).includes(scope.task)),
            )
            .map((job) => job.id);
    if (gate === "architecture") return jobs.filter((job) => job.kind === "shape").map((job) => job.id);
    return jobs
        .filter(
            (job) =>
                job.kind === "components" &&
                (scope.domain === undefined || named(scope.domain).some((name) => job.id === `components-${name}`)),
        )
        .map((job) => job.id);
};

/**
 * Today's tasks are the code analysis's: a request for changes to them is answered there, by handing back the journeys
 * job of the capability (or all of them), driving it, writing the payloads again and deriving the tasks again. There
 * is no job of this skill to hand back, so the request is marked applied and says what to do.
 * @param layout the run's folders
 * @param history every request made at the gate
 * @param request the request to apply
 * @returns what to do
 */
const handBackToAnalysis = (layout: Layout, history: ChangeRequest[], request: ChangeRequest) => {
    writeJson(
        changesPath(layout, "as-is"),
        history.map((each) => (each === request ? { ...each, applied: true } : each)),
    );
    const job =
        request.scope.task === undefined
            ? "the journeys jobs it concerns (`journeys-of-<capability>`, then `journeys-merge`)"
            : `\`journeys-of-${request.scope.task.replace(/^tasks-/, "").split(".")[0] ?? ""}\`, then \`journeys-merge\``;
    return {
        ok: true,
        text: `Today's tasks are written by the code analysis, so this is answered there: in ${join(layout.outputRoot, ".code-analysis")}, hand back ${job} with \`publish-pages.ts prepare <job> --custom-instructions "${request.text}"\`, drive them with its \`next\`, \`finish\` Publish, run its \`write-payloads.ts\`, then \`derive.ts current ${layout.outputRoot}\` here, and ask the person again.`,
    };
};

/**
 * Hands the jobs a request for changes is about back to their writers, with the person's words as instructions.
 * @param layout the run's folders
 * @param gate the decision
 * @returns the jobs handed back, or why none were
 */
export const applyChanges = (layout: Layout, gate: Gate): { ok: boolean; text: string } => {
    const history = changeHistory(layout, gate);
    const request = history.find((each) => !each.applied);
    if (request === undefined)
        return { ok: false, text: `no unapplied changes for ${gate}: ask for them with choose.ts --changes` };
    if (gate === "as-is") return handBackToAnalysis(layout, history, request);
    const ids = jobsFor(layout, gate, request.scope);
    if (ids.length === 0)
        return {
            ok: false,
            text: `no ${gate} job matches ${JSON.stringify(request.scope)}: prepare the stage first, or name another scope`,
        };
    const lines: string[] = [];
    for (const id of ids) {
        const result = redo(layout, id, request.text);
        if (!result.includes("handed back")) return { ok: false, text: `${id}: ${result}` };
        lines.push(`- ${result}`);
    }
    writeJson(
        changesPath(layout, gate),
        history.map((each) => (each === request ? { ...each, applied: true } : each)),
    );
    return {
        ok: true,
        text: `${lines.join("\n")}\nDrive them with \`stage.ts next\`, then \`stage.ts finish ${gate}\`.`,
    };
};
