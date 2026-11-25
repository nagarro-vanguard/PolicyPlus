import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadDisputes } from "../../../shape-target/shared/disputes";
import { journeyId } from "../../../shape-target/shared/model/ids";
import { layoutOf as shapeLayoutOf } from "../../../shape-target/shared/model/layout";
import type { Layout } from "../model/layout";
import type { Conflict, Plan } from "../model/plan";
import type { Story } from "../model/records";
import { jobPaths, loadJobs } from "../jobs/state";

/*
 * The challenges a reviewer raised that survived the one fix a job gets, carried into the plan so its reader sees them:
 * those of the target's decisions (shape-target writes `.shape-target/work/records/disputes-<stage>.json`, read with its
 * `loadDisputes`) and those of this plan's own stages (`stage.ts finish` writes `work/records/disputes.json` as
 * `{ job, says: "Record <n>: ..." }`). The challenges on today's tasks (`disputes-as-is.json`) belong to the code
 * analysis and are not carried.
 */

type Picks = { picks?: { of?: string; variant?: string; id?: string }[] };
const readPicks = (path: string): Picks => {
    try {
        return JSON.parse(readFileSync(path, "utf8")) as Picks;
    } catch {
        return {};
    }
};

/**
 * The surviving challenges of the target's journeys, architecture and components, each settled only when another
 * variant than the one it is about was taken; a challenge on a variant that was taken stays open.
 * @param layout the run's folders
 * @param componentNames the components of the chosen architecture
 * @returns the conflicts
 */
export const targetConflicts = (layout: Layout, componentNames: readonly string[]): Conflict[] => {
    const shaped = shapeLayoutOf(layout.outputRoot);
    const stages = [
        { stage: "journeys", choice: shaped.choiceJourneys },
        { stage: "architecture", choice: shaped.choiceArchitecture },
        { stage: "components", choice: shaped.choiceComponents },
    ] as const;
    return stages.flatMap(({ stage, choice }) => {
        const picked = readPicks(choice);
        const chosen = new Set(
            stage === "journeys"
                ? (picked.picks ?? []).flatMap((pick) =>
                      pick.id !== undefined
                          ? [pick.id]
                          : pick.of !== undefined && pick.variant !== undefined
                            ? [journeyId(pick.of, pick.variant)]
                            : [],
                  )
                : stage === "architecture"
                  ? (picked.picks ?? []).flatMap((pick) => (pick.variant === undefined ? [] : [pick.variant]))
                  : componentNames,
        );
        return loadDisputes(shaped, stage).map((dispute) => ({
            stage,
            job: dispute.job,
            record: dispute.record,
            variant: dispute.variant,
            says: dispute.says,
            resolved: dispute.variant !== "" && !chosen.has(dispute.variant),
        }));
    });
};

type Output = { layers?: { id?: string }[]; decisions?: { id?: string }[]; stories?: Story[] };

/** What a record of one of this plan's jobs became: a layer's id, a decision's id, or the key of the story it made. */
const variantOf = (layout: Layout, job: string, record: number, plan: Plan): string => {
    const path = jobPaths(layout, job).output;
    if (record < 0 || !existsSync(path)) return "";
    const output = JSON.parse(readFileSync(path, "utf8")) as Output;
    const layers = output.layers ?? [];
    const decisions = output.decisions ?? [];
    if (record < layers.length) return layers[record]?.id ?? "";
    if (record < layers.length + decisions.length) {
        const id = decisions[record - layers.length]?.id;
        return id === undefined ? "" : `${job}.${id}`;
    }
    const story = (output.stories ?? [])[record - layers.length - decisions.length];
    if (story === undefined) return "";
    const overlap = (mine: readonly string[] | undefined, theirs: readonly string[] | undefined) =>
        (mine ?? []).some((each) => (theirs ?? []).includes(each));
    const found = plan.stories.find((view) =>
        (story.components ?? []).length > 0
            ? overlap(story.components, view.components)
            : (story.steps ?? []).length > 0
              ? overlap(story.steps, view.steps)
              : view.title === story.title,
    );
    return found?.key ?? "";
};

/**
 * The surviving challenges of this plan's own stages, each tied to what its record became. The plan never settles them.
 * @param layout the run's folders
 * @param plan the plan
 * @returns the conflicts
 */
export const planConflicts = (layout: Layout, plan: Plan): Conflict[] => {
    const path = join(layout.records, "disputes.json");
    if (!existsSync(path)) return [];
    const stageOf = new Map(loadJobs(layout).jobs.map((job) => [job.id, job.stage as string]));
    return (JSON.parse(readFileSync(path, "utf8")) as { job: string; says: string }[]).map((dispute) => {
        const parsed = /^Record (\d+): ([\s\S]*)$/.exec(dispute.says);
        const record = parsed === null ? -1 : Number(parsed[1]);
        return {
            stage: stageOf.get(dispute.job) ?? "stories",
            job: dispute.job,
            record,
            variant: variantOf(layout, dispute.job, record, plan),
            says: parsed?.[2] ?? dispute.says,
            resolved: false,
        };
    });
};
