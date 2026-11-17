import { Effect } from "effect";
import type { JsonRecord } from "../../shared/model/json-record";
import { ScopeFiles } from "../../shared/read/scope-files";
import { ofType } from "../../shared/read/record-reading";
import { citedFiles, scopeGaps } from "../../shared/read/record-writing";
import { checkReviewedJob } from "../../shared/jobs/review-rounds";
import { missedOutside } from "../../shared/jobs/review-verdicts";
import { CodeKind } from "../../shared/model/schemas/code-kind";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { Layer } from "../../shared/model/schemas/layer";
import { Block, DataDefinition, Link, Span } from "../../shared/model/schemas/map";
import type { Missed } from "../../shared/model/schemas/missed";
import { RecordIdPrefix, type Lines } from "../../shared/model/shared-fields";
import { sourceReader } from "../../shared/source/source-text";
import { clashingBlocks, uncoveredLines } from "./coverage";
import { readAcceptedRegistries } from "./map-registries";
import { startsIn } from "./own-lines";
import { readUnread } from "./unread";
import { reviewedMapJob } from "./map-jobs";

export const mapShapes = { Block, Link, DataDefinition, Span, Layer, CodeKind, ExternalSystem };

type Finding = JsonRecord & { readonly id: string };

type MapContext = Effect.Success<ReturnType<typeof mapContext>>;

/**
 * The Map's gate on one job's records (5.1), on coordinates and ids only: cited lines and link targets lie in the
 * manifest; every record starts in one of the job's windows; no two blocks partly overlap or sit on the same lines; every
 * non-blank line of the windows lies in a block, a data definition, a span or an `Unread`. That a link has a target or
 * says it has none, and that a block has an entry point's fields, are its schema's; that every reference resolves is the
 * rule every reviewed stage shares.
 * @param records the job's records
 * @param context the job's windows and what it is checked against
 * @returns one line per gap
 */
function mapGaps(records: readonly Finding[], context: MapContext): string[] {
    const blocks = ofType(records, RecordIdPrefix.Block, Block);
    const links = ofType(records, RecordIdPrefix.Link, Link);
    const definitions = ofType(records, RecordIdPrefix.DataDefinition, DataDefinition);
    const spans = ofType(records, RecordIdPrefix.Span, Span);
    return [
        ...scopeGaps(records, context.lineCounts, "manifest", (record) => record.id),
        ...links.flatMap((link) => {
            const total = link.to !== undefined && "file" in link.to ? context.lineCounts.get(link.to.file) : undefined;
            return link.to !== undefined && "file" in link.to && (total === undefined || link.to.line > total)
                ? [`${link.id} reaches ${link.to.file}:${link.to.line}, which is not a line of a file in the manifest`]
                : [];
        }),
        ...[...blocks, ...links, ...definitions, ...spans]
            .filter((record) => !startsIn(context.windows, record.lines))
            .map((record) => `${record.id} starts outside the job: it is written by the job its first line falls in`),
        ...clashingBlocks(blocks).map(
            ([one, other]) =>
                `${one.id} and ${other.id} overlap without one holding the other, or sit on the same lines`,
        ),
        ...uncoveredLines({ blocks, definitions, spans, unread: context.unread }, context.windows, context.textOf),
    ];
}

/**
 * What every job of the stage is checked against alike: every entry's record id (a layer, a code kind, an external
 * system), which the stage writes beside its jobs' records in the same commit. Read once per `finish`, once per `check`.
 * @param root the analysis root
 * @returns the entries' record ids
 */
export const readMapEntries = Effect.fnUntraced(function* (root: string) {
    const registries = yield* readAcceptedRegistries(root);
    return new Set<string>(
        [...registries.layers, ...registries.codeKinds, ...registries.externalSystems].map((entry) => entry.id),
    );
});

/**
 * What one job is checked against now: its windows, the manifest's line counts of the files its records cite and its
 * links reach, the text of its windows' files, and the `Unread` lines. Nothing it reads grows with the codebase.
 * @param root the analysis root
 * @param windows the job's windows
 * @param cited every record the check will look at
 * @returns the check's context
 */
const mapContext = Effect.fnUntraced(function* (root: string, windows: readonly Lines[], cited: readonly Finding[]) {
    const { sourceText } = yield* sourceReader(root);
    const targets = ofType(cited, RecordIdPrefix.Link, Link).flatMap((link) =>
        link.to !== undefined && "file" in link.to ? [link.to.file] : [],
    );
    const textOf = new Map<string, readonly string[]>();
    for (const file of new Set(windows.map((window) => window.file))) {
        textOf.set(file, (yield* sourceText(file)).split("\n"));
    }
    return {
        windows,
        textOf,
        lineCounts: yield* (yield* ScopeFiles).lineCountsFor(new Set([...citedFiles(cited), ...targets])),
        unread: yield* readUnread(root),
    };
});

/**
 * The Map under review: the record types a mapping run writes, the gate held to the job's own windows and today's
 * manifest, the job's windows as the lines its receipt must cover, and a missed record placed in the job's own windows.
 * @param root the analysis root
 * @param windows the job's windows
 * @param entries every entry's record id, read once per `finish` or `check`
 * @returns the stage as the review rounds take it
 */
export const mapReview = (root: string, windows: readonly Lines[], entries: ReadonlySet<string>) => ({
    stage: "map" as const,
    shapes: mapShapes,
    checksFor: (cited: readonly Finding[]) =>
        Effect.map(mapContext(root, windows, cited), (context) => ({
            records: (records: readonly Finding[]) => mapGaps(records, context),
            placement: (missed: ReadonlyArray<typeof Missed.Type>) => [
                ...missedOutside(missed, context.lineCounts, "manifest"),
                ...missed
                    .filter((miss) => !miss.evidence.some((lines) => startsIn(windows, lines)))
                    .map((miss) => `the missed record ${miss.id} cites no line starting in this job's windows`),
            ],
            writtenBeside: entries,
            scope: windows,
        })),
});

/**
 * `check`: the gate on one job's map, and, once the reviewer has written, the review's checks and the gate again on
 * what the review would leave. The mapping run and the reviewer both run it as their done-check.
 * @param root the analysis root
 * @param jobId the job id
 * @returns one line per gap; none when the job passes
 */
export const checkMapJob = Effect.fnUntraced(function* (root: string, jobId: string) {
    const { windows, job } = yield* reviewedMapJob(root, jobId);
    return yield* checkReviewedJob(mapReview(root, windows, yield* readMapEntries(root)), job);
});
