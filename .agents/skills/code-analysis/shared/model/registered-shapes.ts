import { Layer } from "effect";
import { ShapeRegistry } from "./shape-registry";
import { FileSummary, ManifestFile } from "./schemas/file-listing";
import { Feedback } from "./schemas/feedback";
import {
    AssignResourcesJob,
    AssignShapesJob,
    AssignEntryPointsJob,
    MergeCandidate,
    MergeCapabilitiesJob,
    MergeEntitiesJob,
} from "./schemas/capabilities-and-entities-jobs";
import { LifecycleJob, RulesJob, UseOfEntity } from "./schemas/capability-rules-jobs";
import { recordTypes } from "./record-types";

const documentShapes = {
    Feedback,
    FileSummary,
    ManifestFile,
    AssignEntryPointsJob,
    AssignResourcesJob,
    AssignShapesJob,
    MergeCapabilitiesJob,
    MergeEntitiesJob,
    MergeCandidate,
    LifecycleJob,
    UseOfEntity,
    RulesJob,
};

export const registeredShapes = Layer.succeed(
    ShapeRegistry,
    ShapeRegistry.of({ records: recordTypes(), documents: documentShapes }),
);
