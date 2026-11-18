import type { Run } from "../core/run-context";
import type { Producer } from "../core/run-layout";
import { agentStanding, countedByType, type Standing } from "../core/stage-run-frame";
import { decisionsOf, type Decision } from "../core/stage-model";

/**
 * Says where a producing stage stands from its rounds: done once accepted or the plan is approved, stopped when its
 * rounds are spent with feedback waiting, not started before a round, else running with what it wrote.
 * @param run the run
 * @param stage the stage
 * @param label the stage's agent as shown, such as "The trace"
 * @returns the standing
 */
export const producerStanding = (run: Run, stage: Producer, label: string): Standing =>
    agentStanding(run, run.rounds[stage], label, countedByType(run.records.byStage[stage]));

/**
 * Gives a producing stage's questions for the approver as decisions that wait on them.
 * @param run the run
 * @param stage the stage
 * @returns the decisions
 */
export const producerDecisions = (run: Run, stage: Producer): Decision[] =>
    decisionsOf(run.records.stageQuestions[stage]);
