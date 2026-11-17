import { scopeGaps } from "../../shared/read/record-writing";
import { Effect } from "effect";
import { AnalysisRequest } from "../../shared/run/analysis-request";
import { readDocument, readDocumentStrictly, readRecords } from "../../shared/run/json-files";
import type { JsonRecord } from "../../shared/model/json-record";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { ofType } from "../../shared/read/record-reading";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { ManifestFile } from "../../shared/model/schemas/file-listing";
import { Technology } from "../../shared/model/schemas/technology";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { leftOut } from "../../shared/source/left-out";

import { inventoryShapes, reviewedInventoryJob } from "./tech-stack-job";
import { missedOutside } from "../../shared/jobs/review-verdicts";
import { Fact } from "../../shared/model/schemas/fact";
import { readCatalogue } from "../../shared/run/catalogue";
import { factGaps } from "../../shared/jobs/fact-gaps";
import { FileSummary } from "../../shared/model/schemas/file-listing";
import { sourceRootsOf } from "../../shared/source/source-roots";
import { SystemPart } from "../../shared/model/schemas/system-part";
import { partGaps } from "./check-parts";
import { fileGaps } from "./check-files";
import type { Missed } from "../../shared/model/schemas/missed";

type Finding = JsonRecord & { readonly id: string };

/**
 * Inventory's records among findings, by the prefix of their record ids.
 * @param records the findings
 * @returns the stack, the parts and the facts
 */
export const inventoryOf = (records: readonly Finding[]) => ({
    stack: ofType(records, RecordIdPrefix.Technology, Technology),
    parts: ofType(records, RecordIdPrefix.SystemPart, SystemPart),
    facts: ofType(records, RecordIdPrefix.Fact, Fact),
});

/**
 * What Inventory's gate holds records to, read once per check: the request and the inventory, so the gate itself reads
 * nothing.
 * @param root the analysis root
 * @returns the context
 */
const inventoryContext = Effect.fnUntraced(function* (root: string) {
    const paths = analysisPaths(root);
    const request = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    const inventory = yield* readRecords(paths.inventory, ManifestFile);
    const listed = yield* readDocumentStrictly(paths.fileSummary, FileSummary);
    return {
        request,
        inventory,
        catalogue: yield* readCatalogue(),
        roots: sourceRootsOf(request.sourceRoots, listed.roots),
    };
});

/**
 * Inventory's gate on a set of its records. Scope: every line a technology or a scope rule cites is in the inventory,
 * a technology cites no file left out, and every scope rule changes the scope of a file. Completeness and readable
 * text: `fileGaps`. Parts:
 * each of a catalogue kind, in one source root, its folders holding code in scope. Facts: the shared fact rules
 * (section 12 of the stage 7.18 plan), their lines in scope, each a risk or an assumption. Necessary,
 * not sufficient: whether what stays in scope is the team's own code is the agent's, the reviewer's and the person's
 * judgement.
 * @param context the request, the inventory, and the cited texts
 * @param records the records judged: the agent's, or what its review leaves
 * @returns one line per gap; none when they pass
 */
function inventoryGaps(context: Effect.Success<ReturnType<typeof inventoryContext>>, records: readonly Finding[]) {
    const { stack, parts, facts } = inventoryOf(records);
    const isLeftOut = leftOut(context.request);
    const inScope = context.inventory.filter((file) => !isLeftOut(file.path));
    const listed = new Map(context.inventory.map((file) => [file.path, file.lines]));
    return [
        ...scopeGaps(stack, listed, "inventory", (entry) => `${entry.kind} ${entry.name}`),
        ...partGaps(
            parts,
            inScope.map((file) => file.path),
            context.catalogue,
            context.roots,
        ),
        ...fileGaps(inScope, stack),
        ...factGaps(facts, {
            catalogue: context.catalogue,
            lineCounts: new Map([...listed].filter(([path]) => !isLeftOut(path))),
        }),
    ];
}

/**
 * Inventory under review: the record types its one job holds, and the gate. Its verdicts need only the shared rules; a
 * missed record points at files in the inventory, left out or not.
 * @param root the analysis root
 * @returns the stage as the review rounds take it
 */
export const inventoryReview = (root: string) => ({
    stage: "inventory" as const,
    shapes: inventoryShapes,
    checksFor: () =>
        Effect.map(inventoryContext(root), (context) => ({
            records: (records: readonly Finding[]) => inventoryGaps(context, records),
            placement: (missed: ReadonlyArray<typeof Missed.Type>) =>
                missedOutside(missed, new Map(context.inventory.map((file) => [file.path, file.lines])), "inventory"),
            writtenBeside: new Set<string>(),
        })),
});

/**
 * `check`: the gate on profile-tech-stack's output, and, once the reviewer has written, the review's verdicts and the
 * gate again on what the review would leave. The agent and the reviewer both run it before they hand back.
 * @param root the analysis root
 * @returns one line per gap; none when the job passes
 */
export const checkInventory = Effect.fnUntraced(function* (root: string) {
    return yield* checkReviewedJob(inventoryReview(root), reviewedInventoryJob(root));
});
