import { Schema } from "effect";
import { LayerId, Lines, Text, about, forPerson, mergedFromOf, ownRecordId } from "../shared-fields";

const layerFields = {
    id: LayerId.annotate(ownRecordId),
    name: Text.annotate(forPerson("Its name in plain words.")),
    purpose: Text.annotate(forPerson("What it does for the system.")),
    evidence: Schema.NonEmptyArray(Lines).annotate(
        about(
            "Lines of the analysed code that show the tier; at least one. Where it lives and what it reaches follow from its code kinds.",
        ),
    ),
    mergedFrom: mergedFromOf(LayerId),
};

export const Layer = Schema.Struct(layerFields).annotate(
    about(
        "A tier of the application, written with the code kinds it holds: every block and data definition is placed in the layer of its code kind.",
    ),
);
