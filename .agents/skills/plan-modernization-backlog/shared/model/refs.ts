import { Schema } from "effect";
import { about, Count, DecisionId, LayerId, RuleId, TransitionId } from "./fields";

export const Ref = Schema.TaggedUnion({
    rule: { id: RuleId },
    transition: { id: TransitionId },
    decision: { id: DecisionId },
    layer: { id: LayerId },
    goal: { number: Count },
    step: { id: Schema.String.annotate(about("The id of a step of a chosen journey.")) },
}).annotate(
    about(
        "What a criterion rests on: a rule or a state change of the legacy system, a decision, a layer, a goal of the request (by its number), or a journey step whose new behaviour it states.",
    ),
);

export type Ref = typeof Ref.Type;
