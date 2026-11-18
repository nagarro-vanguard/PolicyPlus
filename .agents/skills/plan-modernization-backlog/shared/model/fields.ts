import { Schema } from "effect";

/**
 * The annotation that describes a schema or property in one sentence.
 * @param description the sentence
 * @returns the annotation to pass to `annotate`
 */
export const about = (description: string) => ({ description });

export const Text = Schema.String.check(Schema.isMinLength(1));

export const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

/** An id of the analysis or of this plan: branded so a rule's id cannot stand in for an action's. */
export const RuleId = Schema.String.pipe(Schema.brand("RuleId"));
export const TransitionId = Schema.String.pipe(Schema.brand("TransitionId"));
export const ActionId = Schema.String.pipe(Schema.brand("ActionId"));
export const LayerId = Schema.String.pipe(Schema.brand("LayerId"));
export const DecisionId = Schema.String.pipe(Schema.brand("DecisionId"));
export const StoryKey = Schema.String.pipe(Schema.brand("StoryKey"));
