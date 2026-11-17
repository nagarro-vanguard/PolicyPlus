import { Effect, Result, Schema } from "effect";
import { assumptionNotices } from "../../shared/read/assumptions";
import { FileAccess } from "../../shared/source/file-access";
import { AnyRecord, readRecords } from "../../shared/run/json-files";
import type { LoopJob } from "../../shared/jobs/loop-jobs";
import { readMapJob } from "../../shared/jobs/map-job-list";
import { prefixOf } from "../../shared/model/record-ids";
import { evidenceOf, type Fact } from "../../shared/model/schemas/fact";
import { Link } from "../../shared/model/schemas/map";
import type { AssumptionNotice } from "../../shared/model/schemas/stage-actions";
import { RecordInvalid } from "../../shared/run/script-errors";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { proposingNamed, requireMapRegistries } from "./map-registries";
import { startsIn } from "./own-lines";

const strict = { onExcessProperty: "error" } as const;

/**
 * The links of a job's output whose target the code does not show, each as last written; none before the agent writes.
 * @param path the job's output
 * @returns the links' words on where they go
 */
const unseenTargetsIn = Effect.fnUntraced(function* (path: string) {
    if (!(yield* (yield* FileAccess).exists(path))) {
        return [];
    }
    const last = new Map<string, { readonly line: number; readonly record: unknown }>();
    for (const [i, record] of (yield* readRecords(path, AnyRecord)).entries()) {
        if (typeof record.id === "string" && prefixOf(record.id) === RecordIdPrefix.Link) {
            last.delete(record.id);
            last.set(record.id, { line: i + 1, record });
        }
    }
    const words: string[] = [];
    for (const { line, record } of last.values()) {
        const decoded = Schema.decodeUnknownResult(Link, strict)(record);
        if (Result.isFailure(decoded)) {
            return yield* new RecordInvalid({ path, line, issue: `Link: ${decoded.failure.message}` });
        }
        if (decoded.success.unresolvedTarget !== undefined) {
            words.push(decoded.success.unresolvedTarget);
        }
    }
    return words;
});

/**
 * What one of the Map's jobs leaves uncertain, for the person when its batch closes (P1.32, plan 0006): a proposing
 * job's assumptions as written; a Map job's calls whose target the code does not show, counted, with what the first
 * shows. The Map writes their assumptions once every job is decided, so the notice has no record id to challenge yet.
 * @param root the analysis root
 * @param job the job
 * @returns the notices
 */
export const mapNotices = Effect.fnUntraced(function* (root: string, job: LoopJob) {
    if (proposingNamed(yield* requireMapRegistries(), job.key) !== undefined) {
        return yield* assumptionNotices(job.label, job.outputPath);
    }
    const [first, ...rest] = yield* unseenTargetsIn(job.outputPath);
    if (first === undefined) {
        return [];
    }
    const notice: AssumptionNotice = {
        job: job.label,
        statement: `Calls in these lines whose target the code does not show: ${rest.length + 1}. The first: ${first}`,
        why: "The target is chosen from settings or data no file in scope holds.",
        ifWrong: "The flows through these calls go on into code the account does not follow.",
    };
    return [notice];
});

/**
 * The jobs one of the Map's own assumptions rests on, for the person's word on it (P1.32, plan 0006, decision E): for
 * calls whose target the code does not show, the Map jobs whose windows hold its places; for code or links no registry
 * entry fits, the registry's proposing job, whose next accepted registry goes to the jobs holding them. None for any
 * other fact, which a job's own output holds.
 * @param root the analysis root
 * @param fact the assumption
 * @returns the job keys
 */
export const mapAssumptionOwners = Effect.fnUntraced(function* (root: string, fact: typeof Fact.Type) {
    const state = yield* requireMapRegistries();
    const registry =
        fact.aspect === "inside" ? "codeKinds" : fact.aspect === "external-systems" ? "externalSystems" : undefined;
    if (registry !== undefined) {
        return state.proposing.filter((job) => job.registry === registry).map((job) => job.jobId);
    }
    if (fact.aspect !== "connections") {
        return [];
    }
    const places = evidenceOf(fact).map((place) => place.lines);
    const owners: string[] = [];
    for (const jobId of state.order) {
        const { lines } = yield* readMapJob(root, jobId);
        if (places.some((place) => startsIn(lines, place))) {
            owners.push(jobId);
        }
    }
    return owners;
});
