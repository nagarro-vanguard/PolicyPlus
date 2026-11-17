import { Schema } from "effect";
import {
    ExternalSystemId,
    Lines,
    Text,
    about,
    copiedFromCode,
    forAgent,
    forPerson,
    mergedFromOf,
    ownRecordId,
} from "../shared-fields";

const ExternalSystemKind = Schema.Literals(["dataStore", "messaging", "outsideService", "library"]).annotate(
    about(
        "What kind of thing outside the code it is; groups external systems on pages. A `library` is code with no source here: a call into it names the operation as its resource, never data, and the flow is not followed further (P12.3).",
    ),
);

const externalSystemFields = {
    id: ExternalSystemId.annotate(ownRecordId),
    name: Text.annotate(forPerson("What it is, in plain words, for example the main database or the email service.")),
    kind: ExternalSystemKind,
    reachedBy: Text.annotate(
        forPerson("How the code reaches it; shown with the system wherever the system is listed."),
    ),
    membershipRule: Text.annotate(
        forAgent(
            "Every address, settings key and client type the code reaches it by, and, where one address serves two systems, what the code asks of this one.",
        ),
    ),
    evidence: Schema.NonEmptyArray(Lines).annotate(about("The lines that show how it is reached; at least one.")),
    reachedThrough: Schema.optionalKey(
        Schema.Struct({
            name: Text.annotate(
                copiedFromCode(
                    "The code it is reached through, as the code names it: a library, a package, a load module whose source is not in scope.",
                ),
            ),
            evidence: Schema.NonEmptyArray(Lines).annotate(about("The lines that reference that code; at least one.")),
        }),
    ).annotate(
        about(
            "Present only when the system reaches it through code with no source in scope (`find-files-in-scope.ts` answers whether it has), so the analysis stops there. A compiled copy of code whose source is in scope is not such code: that source is mapped, and each external system it reaches is an external system of its own.",
        ),
    ),
    mergedFrom: mergedFromOf(ExternalSystemId),
};

export const ExternalSystem = Schema.Struct(externalSystemFields).annotate(
    about(
        "One external system the code talks to (a data store, a messaging channel, an external service), an entry of the Map's external-systems registry: every Map link to it names it, so systems lumped into one, or one system written twice, blur where each flow ends. A data store is one whether or not its schema is in scope (its schema is data definitions declaring its resources); a service whose code is in scope is a part, never an external system.",
    ),
);

/**
 * How the code reaches an external system, with the code without source it passes through when there is any.
 * @param externalSystem the external system
 * @param externalSystem.reachedBy how the code reaches it
 * @param externalSystem.reachedThrough the code without source it is reached through, when there is any
 * @returns the words
 */
export const howItIsReached = (externalSystem: {
    readonly reachedBy: string;
    readonly reachedThrough?: { readonly name: string };
}) =>
    externalSystem.reachedThrough === undefined
        ? externalSystem.reachedBy
        : `${externalSystem.reachedBy}, through ${externalSystem.reachedThrough.name}, whose source we do not have`;
