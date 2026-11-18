import { Schema } from "effect";

/**
 * The annotation that describes a schema or property in one sentence.
 * @param description the sentence
 * @returns the annotation to pass to `annotate`
 */
export const about = (description: string) => ({ description });

export const Text = Schema.String.check(Schema.isMinLength(1));

/** Ids of the analysis, branded so that a rule's id cannot stand in for an action's. */
export const ActionId = Schema.String.pipe(Schema.brand("ActionId"));
export const RuleId = Schema.String.pipe(Schema.brand("RuleId"));
export const EntityId = Schema.String.pipe(Schema.brand("EntityId"));
export const ExternalId = Schema.String.pipe(Schema.brand("ExternalId"));
/** Ids made by this skill. */
export const TaskId = Schema.String.pipe(Schema.brand("TaskId"));
export const StepId = Schema.String.pipe(Schema.brand("StepId"));

export const Actions = Schema.Array(ActionId).check(Schema.isMinLength(1));
