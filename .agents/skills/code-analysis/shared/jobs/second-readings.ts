import { basename, join } from "node:path";
import { Effect, Schema } from "effect";
import { analysisPaths, type Stage } from "../run/analysis-layout";
import { FileAccess } from "../source/file-access";
import { AnyRecord, readRecords } from "../run/json-files";
import { latestRecords } from "./second-round";
import type { JsonRecord } from "../model/json-record";
import { RecordReads } from "../read/record-reads";
import { labelsAfterReview, type ReviewLabel } from "./review-labels";
import type { Verdict } from "./review-verdicts";
import { DocumentInvalid } from "../run/script-errors";
import { Review } from "../model/schemas/review";

type Finding = JsonRecord & { readonly id: string };

type JobFiles = { readonly outputPath: string; readonly reviewPath: string; readonly roundsFolder: string };

/**
 * The verdicts one review file holds, each decoded by the `Review` schema; its missed records are not verdicts.
 * @param path the review
 * @returns the verdicts
 */
const verdictsIn = Effect.fnUntraced(function* (path: string) {
    const verdicts: Verdict[] = [];
    for (const record of yield* readRecords(path, AnyRecord)) {
        if ("verdict" in record) {
            verdicts.push(
                yield* Effect.try({
                    try: () => Schema.decodeUnknownSync(Review, { onExcessProperty: "error" })(record),
                    catch: (cause) => new DocumentInvalid({ path, issue: String(cause) }),
                }),
            );
        }
    }
    return verdicts;
});

/**
 * What the last review of a job judged, read from its files alone (P1.36): its review in place, else the latest
 * numbered round holding one (the round its fix answered). The rounds are counted up from the first until one is
 * missing; none when no review was ever written.
 * @param files the job's output, review and rounds folder
 * @returns the findings judged and the challenges, or none
 */
const lastJudgedOf = Effect.fnUntraced(function* (files: JobFiles) {
    const fs = yield* FileAccess;
    let last:
        | {
              readonly findings: readonly Finding[];
              readonly verdicts: readonly Verdict[];
              readonly later?: readonly Verdict[];
          }
        | undefined;
    for (let round = 1; yield* fs.exists(join(files.roundsFolder, String(round))); round += 1) {
        const output = join(files.roundsFolder, String(round), basename(files.outputPath));
        const review = join(files.roundsFolder, String(round), basename(files.reviewPath));
        if ((yield* fs.exists(output)) && (yield* fs.exists(review))) {
            last = { findings: yield* latestRecords(output), verdicts: yield* verdictsIn(review) };
        }
    }
    if (yield* fs.exists(files.reviewPath)) {
        return last === undefined
            ? { findings: yield* latestRecords(files.outputPath), verdicts: yield* verdictsIn(files.reviewPath) }
            : { ...last, later: yield* verdictsIn(files.reviewPath) };
    }
    return last;
});

/**
 * The files a job of a stage may have written its output to, by its job id: a How it runs study, a Capabilities and
 * entities job (entries or assignments), a Capability rules job (a life or rules), or a concluding job.
 * @param root the analysis root
 * @param stage the stage
 * @param jobId the job id
 * @returns the candidate files, each with its review and rounds
 */
const jobFilesOf = (root: string, stage: Stage, jobId: string): JobFiles[] => {
    const paths = analysisPaths(root);
    const own = (outputs: readonly string[], reviewPath: string, roundsFolder: string) =>
        outputs.map((outputPath) => ({ outputPath, reviewPath, roundsFolder }));
    const stageJob =
        stage === "how-it-runs"
            ? own([paths.studyOutput(jobId)], paths.reviewOutput(jobId), paths.studyRounds(jobId))
            : stage === "capabilities-and-entities"
              ? own(
                    [paths.capabilitiesAndEntities.entries(jobId), paths.capabilitiesAndEntities.assignments(jobId)],
                    paths.capabilitiesAndEntities.review(jobId),
                    paths.capabilitiesAndEntities.rounds(jobId),
                )
              : stage === "capability-rules"
                ? own(
                      [paths.capabilityRules.lifecycle(jobId), paths.capabilityRules.rules(jobId)],
                      paths.capabilityRules.review(jobId),
                      paths.capabilityRules.rounds(jobId),
                  )
                : [];
    return [...stageJob, paths.conclusions(stage).files(jobId)];
};

/**
 * The files of the job that wrote a record: Inventory's one job and Publish's briefing when no job id is kept; a How it
 * runs study, a Capabilities and entities job, a Capability rules job or a concluding job by its id, whichever holds an
 * output. None for a record no reviewed job writes (the Map's assumptions, the entries a stage writes itself).
 * @param root the analysis root
 * @param writer the fact's stage and job id
 * @param writer.stage the stage
 * @param writer.jobId its job id, when a job wrote it
 * @returns the job's files, or none
 */
const writerFiles = Effect.fnUntraced(function* (
    root: string,
    writer: { readonly stage: Stage; readonly jobId: string | null },
) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root);
    const { stage, jobId } = writer;
    const candidates: JobFiles[] =
        jobId === null
            ? stage === "inventory"
                ? [
                      {
                          outputPath: paths.techStackOutput,
                          reviewPath: paths.techStackReview,
                          roundsFolder: paths.techStackRounds,
                      },
                  ]
                : stage === "publish"
                  ? [
                        {
                            outputPath: paths.briefingOutput,
                            reviewPath: paths.briefingReview,
                            roundsFolder: paths.briefingRounds,
                        },
                    ]
                  : []
            : jobFilesOf(root, stage, jobId);
    for (const files of candidates) {
        if (yield* fs.exists(files.outputPath)) {
            return files;
        }
    }
    return undefined;
});

/**
 * Where a second reading left each accepted record of one type (P1.36, P10): derived when the pages are drawn, by one
 * rule (`labelsAfterReview`), from the review files of the job that wrote it, never stored. Each job's files are read
 * once, so what is read grows with the jobs writing such records, never with the code. A record with no label was not
 * read a second time. Facts, rules, changes of state and areas are labelled alike (D223, D226).
 * @param root the analysis root
 * @param type the record type
 * @returns each labelled record's label, by its record id
 */
export const readSecondReadings = Effect.fnUntraced(function* (root: string, type: string) {
    const writers = yield* (yield* RecordReads).findWritersOfType(type);
    const labels = new Map<string, ReviewLabel>();
    const read = new Set<string>();
    for (const writer of writers) {
        const key = JSON.stringify([writer.stage, writer.jobId]);
        if (read.has(key)) {
            continue;
        }
        read.add(key);
        const files = yield* writerFiles(root, writer);
        const judged = files === undefined ? undefined : yield* lastJudgedOf(files);
        if (files !== undefined && judged !== undefined) {
            labelsAfterReview(judged, yield* latestRecords(files.outputPath), judged.later).forEach((label) =>
                labels.set(label.id, label),
            );
        }
    }
    return labels;
});
