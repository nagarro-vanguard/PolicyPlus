import { Schema } from "effect";
import {
    BlockId,
    CapabilityId,
    DataDefinitionId,
    EntityId,
    EntryPointAssignmentId,
    Lines,
    ResourceAssignmentId,
    ResourceId,
    ShapeAssignmentId,
    Text,
    about,
    exactlyOneOf,
    forScripts,
    forPerson,
    ownRecordId,
} from "../shared-fields";

const notBusinessDataReason = Schema.optionalKey(
    Text.annotate(
        forPerson("Why one of its records is no kind of data the business knows (an error, a page request, a cache)."),
    ),
);

/**
 * The lines an assignment cites, inside the lines its unit may cite.
 * @param what the lines, as the description names them
 * @returns the schema
 */
const evidence = (what: string) =>
    Schema.NonEmptyArray(Lines).annotate(about(`Lines inside ${what} that show the answer; at least one.`));

export const EntryPointAssignment = Schema.Struct({
    id: EntryPointAssignmentId.annotate(ownRecordId),
    entryPoint: BlockId.annotate(
        about("The entry point, by its block's record id: one assignment for each entry point."),
    ),
    capability: CapabilityId.annotate(
        about("The capability it serves: one of the registry, or one this job wrote where none fitted."),
    ),
}).annotate(about("An entry point given its capability."));

export const ResourceAssignment = Schema.Struct({
    id: ResourceAssignmentId.annotate(ownRecordId),
    resource: ResourceId.annotate(forScripts("The resource, by the id the job lists for it: one assignment for each.")),
    entity: Schema.optionalKey(
        EntityId.annotate(
            about("The entity its records keep: one of the registry, or one this job wrote where none fitted."),
        ),
    ),
    notBusinessDataReason,
    evidence: evidence("a definition declaring the resource or a link using it"),
})
    .check(exactlyOneOf(["entity", "notBusinessDataReason"]))
    .annotate(about("A resource given its entity, or the reason it keeps no kind of data."));

export const ShapeAssignment = Schema.Struct({
    id: ShapeAssignmentId.annotate(ownRecordId),
    definition: DataDefinitionId.annotate(about("The data definition, declaring no resource, by its record id.")),
    entity: Schema.optionalKey(
        EntityId.annotate(
            about("The entity it shapes, in its layer: one of the registry, or one this job wrote where none fitted."),
        ),
    ),
    notBusinessDataReason,
})
    .check(exactlyOneOf(["entity", "notBusinessDataReason"]))
    .annotate(about("A data shape given the entity it shapes, or the reason it shapes none."));
