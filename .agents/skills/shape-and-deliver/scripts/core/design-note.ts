import type { PlanRequest } from "./delivery-request";
import type { Producer } from "./run-layout";

/**
 * Words the note a plan stage's agent gets when its build follows a picked design: orient and trace keep the design's
 * records and update them, and the changes stage reads the design's changes and decisions to derive its own.
 * @param stage the plan stage
 * @param request the plan request
 * @returns the note, or undefined when the build follows no design or the stage has nothing to be told
 */
export const designNote = (stage: Producer, request: PlanRequest) => {
    if (request.fromDesign === undefined) {
        return undefined;
    }
    if (stage === "orient" || stage === "trace") {
        return "This build follows the story's picked design: your records are the design's analysis of the story. Keep what still holds, and update what the build changes, such as every operation the design stood in for.";
    }
    if (stage === "changes") {
        const where =
            request.fromDesign.changesPath === undefined
                ? "."
                : `: the design's own code changes and decisions are in ${request.fromDesign.changesPath}; read them for what the designer decided.`;
        return `This build follows the story's picked design${where} The build's own changes and decisions are yours, derived afresh.`;
    }
    return undefined;
};
