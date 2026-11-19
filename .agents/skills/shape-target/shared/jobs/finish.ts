import { Schema } from "effect";
import { finalGaps, isCopy, scoreOf } from "../derive/checks";
import { journeyId, stepId } from "../model/ids";
import type { Layout } from "../model/layout";
import { Architecture, Component, Journey, type StoredJourney } from "../model/records";
import { loadJourneys, loadTasks } from "../run";
import { join } from "node:path";
import { chosenArchitecture, designContext } from "./stages";
import { loadJobs, outputOf, writeJson, type Stage } from "./state";

export type Finished = { ok: boolean; text: string };

/**
 * Merges the accepted outputs of a stage into the run's records, and lists what stayed disputed. The components stage
 * also runs the checks across the whole chosen architecture and writes it only when they pass.
 * @param layout the run's folders
 * @param stage the stage
 * @returns whether it finished, and what it did
 */
export const finish = (layout: Layout, stage: Stage): Finished => {
    const jobs = loadJobs(layout);
    const mine = jobs.jobs.filter((job) => job.stage === stage);
    if (mine.length === 0 || mine.some((job) => job.state !== "decided"))
        return { ok: false, text: `the ${stage} stage is not finished` };
    const disputes = mine.flatMap((job) => job.disputes.map((says) => ({ job: job.id, says })));
    writeJson(join(layout.records, `disputes-${stage}.json`), disputes);
    const note = `${disputes.length} challenges stayed disputed`;
    if (stage === "journeys") {
        const tasks = loadTasks(layout);
        const journeys: StoredJourney[] = mine
            .flatMap((job) =>
                Schema.decodeUnknownSync(Schema.Array(Journey))(
                    outputOf<{ journeys: unknown }>(layout, job.id)?.journeys ?? [],
                ),
            )
            .map((journey) => {
                const id = journeyId(journey.task, journey.name);
                const current = tasks.find((task) => task.id === journey.task)?.current ?? [];
                return {
                    ...journey,
                    id,
                    task: journey.task as StoredJourney["task"],
                    steps: journey.steps.map((step, at) => ({
                        ...step,
                        id: stepId(id, at + 1) as StoredJourney["steps"][number]["id"],
                    })),
                    baseline: isCopy(journey, current),
                };
            });
        const lost = tasks.filter((task) => !journeys.some((journey) => journey.task === task.id));
        if (lost.length > 0)
            return {
                ok: false,
                text: `${lost.length} tasks have no journeys: ${lost.map((task) => task.id).join(", ")}`,
            };
        writeJson(layout.journeyVariants, journeys);
        return { ok: true, text: `${journeys.length} journeys for ${tasks.length} tasks accepted; ${note}` };
    }
    if (stage === "architecture") {
        const variants = Schema.decodeUnknownSync(Schema.Array(Architecture))(
            outputOf<{ architectures: unknown }>(layout, "shape")?.architectures ?? [],
        );
        const journeys = loadJourneys(layout);
        writeJson(
            layout.architectureVariants,
            variants.map((variant) => ({ ...variant, score: scoreOf(variant, journeys) })),
        );
        return { ok: true, text: `${variants.length} architectures accepted; ${note}` };
    }
    const chosen = chosenArchitecture(layout);
    if (chosen === undefined) return { ok: false, text: "no architecture is chosen" };
    const components = mine.flatMap((job) =>
        Schema.decodeUnknownSync(Schema.Array(Component))(
            outputOf<{ components: unknown }>(layout, job.id)?.components ?? [],
        ),
    );
    const { score: _score, ...architecture } = chosen;
    const whole = { ...architecture, components };
    const gaps = finalGaps(whole, designContext(layout));
    if (gaps.length > 0)
        return {
            ok: false,
            text: `${gaps.map((gap) => `- ${gap}`).join("\n")}\nRun the job of the domain that should fix a gap again with \`redo <job> --instructions <the gap>\`, then finish again.`,
        };
    writeJson(layout.architecture, whole);
    return {
        ok: true,
        text: `${components.length} components in ${whole.domains.length} domains accepted, every check passes; ${note}`,
    };
};
