import { Schema } from "effect";
import { FactId, Text, about } from "../model/shared-fields";

export const AssumptionsAccepted = Schema.Struct({
    acceptedAt: Text.annotate(about("When the person accepted the register, as an ISO date and time.")),
    facts: Schema.Array(FactId).annotate(about("The assumptions the register held then, each by its record id.")),
}).annotate(about("The person's acceptance of the assumptions register as a whole (P1.32, P4e.11)."));
