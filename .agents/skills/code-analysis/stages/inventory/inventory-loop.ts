import { assumptionNotices } from "../../shared/read/assumptions";
import { rememberSource } from "../../shared/read/provenance";
import { RecordStore } from "../../shared/store/database";
import { Effect } from "effect";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { analysisPaths, inventoryJobLabel, scriptsCommand } from "../../shared/run/analysis-layout";
import { FileAccess } from "../../shared/source/file-access";
import { GitRepository } from "../../shared/source/git-repository";
import { feedbackArgument } from "../../shared/jobs/job-feedback";
import { readDocument, writeJsonl } from "../../shared/run/json-files";
import { leftOut } from "../../shared/source/left-out";
import { stageLoop } from "../../shared/jobs/loop-jobs";
import { reviewCall } from "../../shared/jobs/review-sheet";
import { checkInventory, inventoryReview } from "./check-tech-stack";
import { finishInventory } from "./finish-inventory";
import { listFiles, summarise } from "./list-files";
import { unreadRecordsOf } from "./unread-records";
import type { ManifestFile } from "../../shared/model/schemas/file-listing";
import { inventoryReviewCall, prepareTechStack, reviewedInventoryJob, techStackFiles } from "./tech-stack-job";

const job = "profile-tech-stack";

/**
 * `list`: list and measure every file the source roots' repositories track, and write the inventory (everything listed)
 * and the file summary (files in scope after the request's Leave Out); the store keeps the repository and the commit
 * each root was at, which every context names.
 * @param root the analysis root
 * @returns how many files were listed and are in scope, and what was skipped
 */
export const listInventory = Effect.fnUntraced(function* (root: string) {
    const paths = analysisPaths(root);
    const request = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    const { files, skipped, heads } = yield* listFiles(request.sourceRoots, root);
    const isLeftOut = leftOut(request);
    yield* writeJsonl(
        paths.inventory,
        files.map(
            ({
                path,
                lines,
                bytes,
                hash,
                readsAs,
                encoding,
                encodingUncertain,
                readFrom,
                copyOf,
            }): typeof ManifestFile.Encoded => ({
                path,
                lines,
                bytes,
                hash,
                readsAs,
                encoding,
                ...(encodingUncertain ? { encodingUncertain: true as const } : {}),
                ...(readFrom === undefined ? {} : { readFrom }),
                ...(copyOf === undefined ? {} : { copyOf }),
            }),
        ),
    );
    yield* writeJsonl(paths.unread, yield* unreadRecordsOf(files));
    const inScope = files.filter((file) => !isLeftOut(file.path));
    const [first, ...rest] = heads;
    if (first === undefined) {
        throw new Error("a request names at least one source root, so the listing reads at least one commit");
    }
    const config = yield* AnalysisConfig;
    const summary = summarise(
        inScope,
        { longLineMax: config.longLineMax, foldersMax: config.summaryFoldersMax },
        skipped,
        [first, ...rest],
    );
    yield* (yield* FileAccess).writeText(paths.fileSummary, JSON.stringify(summary, null, 2));
    yield* rememberSource(
        yield* RecordStore,
        request.sourceRoots.flatMap((each, index) => {
            const head = heads[index];
            return head === undefined ? [] : [{ root: each, commit: head.commit }];
        }),
    );
    return { listed: files.length, inScope: inScope.length, skipped };
});

/**
 * Inventory's one job as the loop takes it.
 * @param root the analysis root
 * @returns the job
 */
const loopJob = (root: string) => {
    const { outputPath, reviewPath, roundsFolder } = techStackFiles(root);
    return Effect.succeed({ key: job, label: inventoryJobLabel, outputPath, reviewed: { reviewPath, roundsFolder } });
};

/**
 * Inventory as the loop drives it (D56): the listing first, then its one job, profile-tech-stack and its review, then
 * `finish`. A finish writing the job or refusing it ends the loop; a fix runs the job once more.
 * @param root the analysis root
 * @returns the stage's loop
 */
export const inventoryLoop = Effect.fnUntraced(function* (root: string) {
    const paths = analysisPaths(root);
    const request = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    return stageLoop({
        stage: "inventory",
        root,
        begin: Effect.gen(function* () {
            if (!(yield* (yield* FileAccess).exists(paths.inventory))) {
                yield* listInventory(root).pipe(Effect.provide(GitRepository.layer));
            }
        }),
        keys: Effect.succeed([job]),
        job: () => loopJob(root),
        mayRun: () => Effect.succeed(true),
        prepare: (keys) =>
            Effect.map(prepareTechStack(root, request.sourceRoots, undefined), (prepared) =>
                keys.map((key) => ({
                    key,
                    call: { agent: "inventory/profile-tech-stack", arguments: prepared.profile },
                })),
            ),
        review: () =>
            Effect.flatMap(feedbackArgument(techStackFiles(root)), (feedback) =>
                reviewCall(
                    inventoryReview(root),
                    reviewedInventoryJob(root),
                    {
                        checklist: paths.reviewChecklist("inventory"),
                        reads: [["the file summary", paths.fileSummary]],
                        beside: `## The whole beyond the findings\nRun \`${scriptsCommand(root)}/inventory-codebase.ts remaining <count>\`: what stays in scope and what the Leave Out removes, ranked by size.`,
                    },
                    inventoryReviewCall(root, request.sourceRoots, feedback),
                ),
            ),
        check: () => checkInventory(root),
        answer: (_, answer) => Effect.asVoid(prepareTechStack(root, request.sourceRoots, answer)),
        registry: Effect.succeed(undefined),
        leftOver: Effect.succeed([]),
        afterClose: () => Effect.void,
        notices: (closed) => assumptionNotices(closed.label, closed.outputPath),
        ownersOf: () => Effect.succeed([]),
        finish: Effect.map(finishInventory(root), ({ outcome, manifest }) => ({
            more: outcome.outcome === "redo",
            said: [
                `profile-tech-stack: ${outcome.outcome}`,
                ...(outcome.outcome === "accepted"
                    ? [
                          `${manifest.length} files and ${manifest.reduce((total, file) => total + file.lines, 0)} lines in scope`,
                      ]
                    : []),
            ],
        })),
    });
});
