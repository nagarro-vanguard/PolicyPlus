import type { RecordName } from "../records";
import type { Stage } from "../run-layout";

export const recordWords = {
    EntityTouched: ["entity touched", "entities touched"],
    InvariantAtRisk: ["fact at risk", "facts at risk"],
    JourneyAffected: ["journey affected", "journeys affected"],
    SeamCrossed: ["place it meets the outside", "places it meets the outside"],
    PathStep: ["path step", "path steps"],
    Question: ["question", "questions"],
    ChangedFile: ["changed file", "changed files"],
    DesignDecision: ["design decision", "design decisions"],
    PlanView: ["diagram", "diagrams"],
    AcceptanceTest: ["test", "tests"],
    LoadThreshold: ["load limit", "load limits"],
    Finding: ["finding", "findings"],
    Deviation: ["departure from the plan", "departures from the plan"],
    TestSupportFile: ["test support file", "test support files"],
    SkillProblem: ["problem with shape-and-deliver", "problems with shape-and-deliver"],
} as const satisfies Record<RecordName, readonly [string, string]>;

const stageTitles: Readonly<Record<Stage, string>> = {
    "work-item": "The work item",
    orient: "What it touches",
    trace: "The story",
    changes: "The code changes",
    tests: "The acceptance tests",
    "plan-review": "The plan",
    "tests-first": "Tests first",
    code: "The code",
    "change-review": "The evidence",
};

/**
 * The name a reader sees for a stage.
 * @param stage the stage
 * @returns its title
 */
export const stageTitle = (stage: Stage) => stageTitles[stage];
