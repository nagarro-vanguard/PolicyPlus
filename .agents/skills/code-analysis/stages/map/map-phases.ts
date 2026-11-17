import { Effect } from "effect";
import { decided, reviewedJobState } from "../../shared/jobs/loop-jobs";
import { prefixOf } from "../../shared/model/record-ids";
import { reviewOutcome } from "../../shared/jobs/review-rounds";
import { decideNew } from "../../shared/jobs/phased-decisions";
import { UsageInvalid } from "../../shared/run/script-errors";
import { RecordIdPrefix } from "../../shared/model/shared-fields";
import { mapReview, readMapEntries } from "./check-map";
import { reviewedMapJob } from "./map-jobs";
import { beginMerge } from "./map-merge";
import { proposingReview, reviewedProposingJob } from "./map-proposing";
import {
    outcomeOf,
    registriesAccepted,
    registryNames,
    writeAcceptedRegistry,
    writeMapRegistries,
    type MapRegistriesState,
} from "./map-registries";

const entryPrefixes = new Set<string>([RecordIdPrefix.Layer, RecordIdPrefix.CodeKind, RecordIdPrefix.ExternalSystem]);

/**
 * Take the proposing jobs decided since; each written one's registry becomes the document the Map's jobs choose from.
 * @param root the analysis root
 * @param state where the registries stand
 * @returns how many were set aside to redo
 */
const decideProposing = Effect.fnUntraced(function* (root: string, state: MapRegistriesState) {
    const jobs = state.proposing.map((job) => ({ ...reviewedProposingJob(root, job), listed: job }));
    const taken = yield* decideNew(jobs, (job) => reviewOutcome(proposingReview(root, job.listed), job));
    for (const each of taken.outcomes.filter((outcome) => outcome.outcome === "accepted")) {
        const entries = each.accepted.filter((record) => entryPrefixes.has(prefixOf(record.id)));
        yield* writeAcceptedRegistry(root, each.job.listed.registry, entries);
    }
    return taken.redo;
});

/**
 * Refuse while a proposing job is refused, its checks still failing after its fix: the Map's jobs choose from its
 * registry, so none can run; a failure the operator acts on, never a question for the person.
 * @param state where the registries stand
 * @returns nothing when none is refused; UsageInvalid naming the registry
 */
const refuseRefusedRegistry = Effect.fnUntraced(function* (state: MapRegistriesState) {
    for (const job of state.proposing) {
        if ((yield* outcomeOf(job.jobId)) === "refused") {
            return yield* new UsageInvalid({
                issue: `${registryNames[job.registry]} could not be written: their checks still fail after their fix, so no Map job can choose from them (show says why); prepare ${job.jobId} runs their owner again`,
            });
        }
    }
});

/**
 * Take the Map's jobs decided since, and count those not decided yet.
 * @param root the analysis root
 * @param state where the registries stand
 * @returns how many were set aside to redo, and how many are not decided
 */
const decideMapJobs = Effect.fnUntraced(function* (root: string, state: MapRegistriesState) {
    const registered = yield* readMapEntries(root);
    const jobs = yield* Effect.forEach(state.order, (jobId) => reviewedMapJob(root, jobId));
    const taken = yield* decideNew(
        jobs.map((each) => ({ ...each.job, windows: each.windows })),
        (job) => reviewOutcome(mapReview(root, job.windows, registered), job),
    );
    let undecided = 0;
    for (const each of jobs) {
        undecided += decided(yield* reviewedJobState(each.job)) ? 0 : 1;
    }
    return { redo: taken.redo, undecided };
});

/**
 * One step of the Map's `finish` before it writes (P1.38): take the proposing jobs decided since, then the Map's jobs;
 * once every Map job is decided, give the proposing jobs the entries the Map's jobs wrote, to merge duplicates; once
 * they have merged them, or none was written, the Map is ready to write. The store is not touched: what is decided is
 * kept in the jobs' reports and the registries' documents until the Map writes once.
 * @param root the analysis root
 * @param state where the registries stand
 * @returns what to say, and whether the Map is ready to write
 */
export const finishPhase = Effect.fnUntraced(function* (root: string, state: MapRegistriesState) {
    const redone = yield* decideProposing(root, state);
    if (redone) {
        return { ready: false, said: [`${redone} proposing jobs to fix`] };
    }
    if (!(yield* registriesAccepted(state))) {
        yield* refuseRefusedRegistry(state);
        return {
            ready: false,
            said: [
                state.merging ? "the registries merge the entries Map jobs wrote" : "the registries are proposed first",
            ],
        };
    }
    const mapped = yield* decideMapJobs(root, state);
    if (mapped.redo) {
        return { ready: false, said: [`${mapped.redo} Map jobs to fix`] };
    }
    if (mapped.undecided) {
        return { ready: false, said: ["the Map's jobs run first"] };
    }
    if (state.merging) {
        return { ready: true, said: [] };
    }
    const merge = yield* beginMerge(root, state);
    yield* writeMapRegistries(merge.state);
    return merge.asked
        ? { ready: false, said: [`${merge.asked} registries merge the entries Map jobs wrote`] }
        : { ready: true, said: ["no Map job wrote an entry, so nothing is merged"] };
});
