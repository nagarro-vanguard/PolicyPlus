import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { evaluatePlan, loadRecords, loadRevisions, runBuild, saveRevisions } from "./run";
import { applyAll, applyRevision, Revision, RevisionRefused, type Entry } from "./revisions";

export type Outcome = { ok: boolean; message: string; gaps?: string[] };

/**
 * Accepts one change a person makes to the plan: it must keep every gate passing, and only then is it saved and the plan written again.
 * @param layout the run's folders
 * @param input the change, as JSON
 * @param note why, in the person's words
 * @returns whether it was accepted and, when not, why
 */
export const revise = (layout: Layout, input: unknown, note = ""): Outcome => {
    let revision: Revision;
    try {
        revision = Schema.decodeUnknownSync(Revision)(input);
    } catch (error) {
        return { ok: false, message: `that is not a change the plan understands: ${String(error).split("\n")[0]}` };
    }
    const entries = loadRevisions(layout);
    try {
        const current = applyAll(loadRecords(layout).stories, entries);
        applyRevision(current, revision);
        const candidate: Entry[] = [...entries, { revision, at: new Date().toISOString(), note }];
        const { gaps } = evaluatePlan(layout, candidate);
        if (gaps.failing.length > 0)
            return { ok: false, message: "the change would break the plan", gaps: gaps.failing };
        saveRevisions(layout, candidate);
        runBuild(layout);
        return { ok: true, message: "the change is accepted and the plan is written again" };
    } catch (error) {
        if (error instanceof RevisionRefused) return { ok: false, message: error.message };
        throw error;
    }
};

export const undo = (layout: Layout): Outcome => {
    const entries = loadRevisions(layout);
    if (entries.length === 0) return { ok: false, message: "there is nothing to undo" };
    saveRevisions(layout, entries.slice(0, -1));
    runBuild(layout);
    return { ok: true, message: "the last change is undone" };
};

export const revert = (layout: Layout): Outcome => {
    saveRevisions(layout, []);
    runBuild(layout);
    return { ok: true, message: "the plan is back to what the agents wrote" };
};
