import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { AnyRecord, readDocument, readOptionalRecords, readRecords } from "../../shared/run/json-files";
import { leftOut } from "../../shared/source/left-out";
import { ScopeFiles } from "../../shared/read/scope-files";
import { settleOutcomes } from "../../shared/read/reviewed-jobs";
import { refuseWhileLaterStagesHaveRecords } from "../../shared/store/stage-guards";
import { StageRecords } from "../../shared/store/stage-records";
import { setRoundAside } from "../../shared/jobs/job-transitions";
import { reviewOutcome } from "../../shared/jobs/review-rounds";
import { ManifestFile } from "../../shared/model/schemas/file-listing";
import { inventoryOf, inventoryReview } from "./check-tech-stack";
import { manifestOf } from "./scope-rules";
import { reviewedInventoryJob } from "./tech-stack-job";

/**
 * Whether a stored `Unread` record lies in one of some files.
 * @param record the record, as written
 * @param files the paths of the files in scope
 * @returns true when its lines are in a file in scope
 */
const isLinedIn = (record: Record<string, unknown>, files: ReadonlySet<string>) => {
    const { lines } = record;
    return (
        typeof lines === "object" &&
        lines !== null &&
        "file" in lines &&
        typeof lines.file === "string" &&
        files.has(lines.file)
    );
};

/**
 * `finish`: decide Inventory's one job by its review and, once accepted, write its accepted records in one transaction
 * of the record store, every read inside it: the manifest (the inventory less what the request's Leave Out leaves out),
 * the parts, the technologies and the facts, its risks and assumptions among them (D153, D165). A job to redo is set aside for its one
 * fix with its feedback and its round counted; a refused one writes nothing and keeps its feedback for the operator
 * (P1.33). Its report and feedback are
 * written once the write is over, never for a commit that did not happen (D74). Refused while How it runs has
 * accepted records made from Inventory's, since changing the stack or the scope beneath them would leave them stale
 * with no error, and while the review leaves a gap. The pages it leaves stale are removed, as by every stage run.
 * @param root the analysis root
 * @returns the job's outcome, and the manifest written when it was accepted; GapsRemain naming each gap
 */
export const finishInventory = Effect.fnUntraced(function* (root: string) {
    const paths = analysisPaths(root);
    const request = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    const job = reviewedInventoryJob(root);
    const files = yield* ScopeFiles;
    const result = yield* (yield* StageRecords).writeStageRecords("inventory", (writer) =>
        Effect.gen(function* () {
            yield* refuseWhileLaterStagesHaveRecords(["how-it-runs"]);
            const outcome = yield* reviewOutcome(inventoryReview(root), job);
            if (outcome.outcome === "redo") {
                return { commit: false, result: { outcome, manifest: [] } };
            }
            if (outcome.outcome === "refused") {
                return { commit: false, result: { outcome, manifest: [] } };
            }
            const { stack, parts, facts } = inventoryOf(outcome.accepted);
            const manifest = manifestOf(yield* readRecords(paths.inventory, ManifestFile), leftOut(request));
            yield* files.replaceManifest(manifest);
            yield* writer.insertRecords("SystemPart", parts);
            yield* writer.insertRecords("Technology", stack);
            yield* writer.insertRecords("Fact", facts);
            const inManifest = new Set(manifest.map((file) => file.path));
            yield* writer.insertRecords(
                "Unread",
                (yield* readOptionalRecords(paths.unread, AnyRecord)).filter((record) => isLinedIn(record, inManifest)),
            );
            return { commit: true, result: { outcome, manifest } };
        }),
    );
    if (result.outcome.outcome === "redo") {
        // set aside outside the rolled-back write, or its state change is lost
        yield* setRoundAside(result.outcome);
    }
    if (result.outcome.outcome !== "redo") {
        yield* settleOutcomes([result.outcome]);
    }
    return result;
});
