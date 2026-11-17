import { Effect } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { readConclusionList } from "../../shared/jobs/conclusion-jobs";
import { FileAccess } from "../../shared/source/file-access";
import { findingsIn, reviewIn } from "../../shared/jobs/review-files";
import { reviewItems } from "../../shared/jobs/review-verdicts";
import { stageAuditJob } from "../../shared/jobs/stage-audit";
import type { FeedbackItem } from "../../shared/model/schemas/feedback";
import { Fact } from "../../shared/model/schemas/fact";
import { definitionOf, readStack } from "./study-cut";
import { readJobList } from "./study-jobs";

export const inventoryOwner = "profile-tech-stack";

/**
 * Each How it runs record's owner: the study or concluding job whose output holds it, read from each job's own output
 * once, as `challenge` finds an assumption's job (plan 0004). The job, not the agent, owns a record.
 * @param root the analysis root
 * @returns each record id's job, by its key
 */
const recordOwners = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root);
    const outputs = [
        ...(yield* readJobList(root)).map((job) => ({ key: job.jobId, path: paths.studyOutput(job.jobId) })),
        ...(yield* readConclusionList(root, "how-it-runs")).map((job) => ({
            key: job.jobId,
            path: paths.conclusions("how-it-runs").files(job.jobId).outputPath,
        })),
    ];
    const owners = new Map<string, string>();
    for (const output of outputs) {
        if (yield* fs.exists(output.path)) {
            for (const finding of yield* findingsIn({ Fact }, output.path)) {
                owners.set(finding.id, output.key);
            }
        }
    }
    return owners;
});

/**
 * Where each item of a whole stage's audit goes (plan 0004): to the jobs that wrote the records it concerns; an item
 * concerning none, to the jobs whose cut holds the files it cites, a file no part holds being Inventory's; an item with
 * neither records nor a file any job holds stays unrouted, for the operator or the person (a catalogue gap).
 * @param root the analysis root
 * @returns each owning job's items, by its key, and the items no job owns
 */
export const routeStageAudit = Effect.fnUntraced(function* (root: string) {
    const review = yield* reviewIn({ Fact }, stageAuditJob(root, "how-it-runs").reviewPath);
    const owners = yield* recordOwners(root);
    const { jobs } = yield* readStack();
    const list = yield* readJobList(root);
    const holding = new Map<string, string>(
        jobs.flatMap((job) => {
            const listed = list.find((each) => each.preparedAgainst === definitionOf(job));
            return listed === undefined ? [] : job.held.map((file) => [file.path, listed.jobId]);
        }),
    );
    const routed = new Map<string, FeedbackItem[]>();
    const unrouted: FeedbackItem[] = [];
    for (const item of reviewItems(review.verdicts, review.missed)) {
        const byRecord = (item.concerns === undefined ? [] : item.concerns).flatMap((id) => {
            const owner = owners.get(id);
            return owner === undefined ? [] : [owner];
        });
        const byFile = (item.lines === undefined ? [] : item.lines).map((lines) => {
            const owner = holding.get(lines.file);
            return owner === undefined ? inventoryOwner : owner;
        });
        const keys = [...new Set(byRecord.length ? byRecord : byFile)];
        if (!keys.length) {
            unrouted.push(item);
        }
        for (const key of keys) {
            const held = routed.get(key);
            routed.set(key, held === undefined ? [item] : [...held, item]);
        }
    }
    return { routed, unrouted };
});
