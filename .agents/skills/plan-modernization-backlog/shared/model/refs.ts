import { Schema } from "effect";
import { about, DecisionId, LayerId, RuleId, TransitionId } from "./fields";

export const Ref = Schema.TaggedUnion({
    rule: { id: RuleId },
    transition: { id: TransitionId },
    decision: { id: DecisionId },
    layer: { id: LayerId },
}).annotate(about("What a criterion rests on: a rule or a state change of the legacy system, a decision, or a layer."));

export type Ref = typeof Ref.Type;
