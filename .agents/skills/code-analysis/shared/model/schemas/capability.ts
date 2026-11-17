import { Schema } from "effect";
import { CapabilityId, Lines, Text, about, forAgent, forPerson, mergedFromOf, ownRecordId } from "../shared-fields";

export class Capability extends Schema.Class<Capability>("code-analysis/Capability")(
    {
        id: CapabilityId.annotate(ownRecordId),
        name: Text.annotate(forPerson("Its name in the product's own words, as a person using it would say it.")),
        purpose: Text.annotate(forPerson("What it offers, in one line; its pages show it.")),
        membershipRule: Text.annotate(
            forAgent(
                "How to tell an entry point that belongs here, and what belongs to a neighbouring capability instead: what every assigning agent chooses by.",
            ),
        ),
        evidence: Schema.NonEmptyArray(Lines).annotate(
            about(
                "Lines showing what it is: a title, a menu label, a route; at least one. Which entry points it holds is their assignments', never this.",
            ),
        ),
        mergedFrom: mergedFromOf(CapabilityId),
    },
    about(
        "A part of what the product offers: one entry of the registry of capabilities. Its page lists every entry point assigned to it, and each of those entry points's pages names it.",
    ),
) {
    /**
     * The entry's line in the registry, as agents read it: its JSON, encoded through its schema.
     * @returns the line
     */
    override toString() {
        return JSON.stringify(Schema.encodeSync(Capability)(this));
    }
}
