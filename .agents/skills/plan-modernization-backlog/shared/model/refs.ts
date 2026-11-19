import { Schema } from "effect";
import { about, DecisionId, LayerId, RuleId, TransitionId } from "./fields";

export const Ref = Schema.TaggedUnion({
    rule: { id: RuleId },
    transition: { id: TransitionId },
    decision: { id: DecisionId },
    layer: { id: LayerId },
    step: { id: Schema.String.annotate(about("The id of a step of a chosen journey.")) },
}).annotate(
    about(
        "What a criterion rests on: a rule or a state change of the legacy system, a decision, a layer, or a journey step whose new behaviour it states.",
    ),
);

export type Ref = typeof Ref.Type;
