import { Schema } from "effect";
import { EntityId, Lines, Text, about, forAgent, forPerson, mergedFromOf, ownRecordId } from "../shared-fields";

export class Entity extends Schema.Class<Entity>("code-analysis/Entity")(
    {
        id: EntityId.annotate(ownRecordId),
        name: Text.annotate(forPerson("Its business name, for what one of its records means.")),
        purpose: Text.annotate(forPerson("What it is, in one line; its pages show it.")),
        membershipRule: Text.annotate(
            forAgent(
                "What one record of it means, and how to tell a resource or a data shape that keeps it from one that keeps a neighbouring entity: what every assigning agent chooses by.",
            ),
        ),
        evidence: Schema.NonEmptyArray(Lines).annotate(
            about(
                "Lines showing what one record means: a declaration, a column, a query, a field a person sees or enters; at least one.",
            ),
        ),
        mergedFrom: mergedFromOf(EntityId),
    },
    about(
        "A kind of data the business knows: one entry of the registry of entities. Its page shows the resources and data shapes assigned to it, and every entry point whose flow saves or reads them names it.",
    ),
) {
    /**
     * The entry's line in the registry, as agents read it: its JSON, encoded through its schema.
     * @returns the line
     */
    override toString() {
        return JSON.stringify(Schema.encodeSync(Entity)(this));
    }
}
