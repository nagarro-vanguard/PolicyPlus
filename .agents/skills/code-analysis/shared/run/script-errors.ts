import { Predicate, Schema } from "effect";

const cause = Schema.optionalKey(Schema.Unknown);

export class FileNotFound extends Schema.TaggedError<FileNotFound>()("FileNotFound", { path: Schema.String }) {
    override get message() {
        return `${this.path} does not exist`;
    }
}

export class FileUnreadable extends Schema.TaggedError<FileUnreadable>()("FileUnreadable", {
    path: Schema.String,
    cause,
}) {
    override get message() {
        return `${this.path} could not be read: ${String(this.cause)}`;
    }
}

export class WriteFailed extends Schema.TaggedError<WriteFailed>()("WriteFailed", { path: Schema.String, cause }) {
    override get message() {
        return `${this.path} could not be written: ${String(this.cause)}`;
    }
}

export class TornTail extends Schema.TaggedError<TornTail>()("TornTail", { path: Schema.String, line: Schema.Number }) {
    override get message() {
        return `${this.path} ends in a cut-off record at line ${this.line}`;
    }
}

export class PathOutsideRoot extends Schema.TaggedError<PathOutsideRoot>()("PathOutsideRoot", {
    path: Schema.String,
    root: Schema.String,
}) {
    override get message() {
        return `${this.path} is outside the analysis root ${this.root}`;
    }
}

export class RecordInvalid extends Schema.TaggedError<RecordInvalid>()("RecordInvalid", {
    path: Schema.String,
    line: Schema.Number,
    issue: Schema.String,
}) {
    override get message() {
        return `bad record at ${this.path}:${this.line}${this.issue ? `: ${this.issue}` : ""}`;
    }
}

export class RecordRejected extends Schema.TaggedError<RecordRejected>()("RecordRejected", {
    reason: Schema.String,
}) {
    override get message() {
        return this.reason;
    }
}

export class DocumentInvalid extends Schema.TaggedError<DocumentInvalid>()("DocumentInvalid", {
    path: Schema.String,
    issue: Schema.String,
}) {
    override get message() {
        return `${this.path}: ${this.issue}`;
    }
}

export class AnalysisRequestInvalid extends Schema.TaggedError<AnalysisRequestInvalid>()("AnalysisRequestInvalid", {
    issue: Schema.String,
}) {
    override get message() {
        return `Invalid code-analysis request: ${this.issue}.`;
    }
}

export class UsageInvalid extends Schema.TaggedError<UsageInvalid>()("UsageInvalid", { issue: Schema.String }) {
    override get message() {
        return this.issue;
    }
}

export class ArtifactMissing extends Schema.TaggedError<ArtifactMissing>()("ArtifactMissing", {
    stage: Schema.String,
    path: Schema.String,
}) {
    override get message() {
        return `${this.stage} failed. Expected artifact: ${this.path}.`;
    }
}

export class GapsRemain extends Schema.TaggedError<GapsRemain>()("GapsRemain", {
    gaps: Schema.Array(Schema.String),
}) {
    override get message() {
        return `${this.gaps.length} gaps remain, so nothing was finished:\n${this.gaps.join("\n")}`;
    }
}

export class GitFailed extends Schema.TaggedError<GitFailed>()("GitFailed", { root: Schema.String, cause }) {
    override get message() {
        return `git could not list the tracked files of ${this.root}; git must be installed to list a Source Root inside a repository: ${String(this.cause)}`;
    }
}

export class SiteBuildFailed extends Schema.TaggedError<SiteBuildFailed>()("SiteBuildFailed", {
    step: Schema.String,
    cause,
}) {
    override get message() {
        return `ux-visuals could not be built (${this.step}): ${String(this.cause)}`;
    }
}

export class StoreBusy extends Schema.TaggedError<StoreBusy>()("StoreBusy", { path: Schema.String }) {
    override get message() {
        return `the record store ${this.path} is held by another finish or prepare: run stage commands one at a time, then try again`;
    }
}

export class StoreFailed extends Schema.TaggedError<StoreFailed>()("StoreFailed", { path: Schema.String, cause }) {
    override get message() {
        return `the record store ${this.path} failed, and nothing was written: ${String(this.cause)}`;
    }
}

export class JobStateFailed extends Schema.TaggedError<JobStateFailed>()("JobStateFailed", {
    path: Schema.String,
    cause,
}) {
    override get message() {
        return `the job state ${this.path} failed, and nothing was changed: ${String(this.cause)}`;
    }
}

export class JobStateOutdated extends Schema.TaggedError<JobStateOutdated>()("JobStateOutdated", {
    path: Schema.String,
}) {
    override get message() {
        return `the job state ${this.path} was made with other table definitions than these scripts': delete it, then run each stage's prepare again`;
    }
}

export class RecordStoreOutdated extends Schema.TaggedError<RecordStoreOutdated>()("RecordStoreOutdated", {
    path: Schema.String,
    found: Schema.Number,
    expected: Schema.Number,
}) {
    override get message() {
        return `the record store ${this.path} was made with other table definitions than these scripts': delete it, then run each stage's finish again, in order`;
    }
}

export class RecordIdRepeated extends Schema.TaggedError<RecordIdRepeated>()("RecordIdRepeated", {
    ids: Schema.Array(Schema.String),
    jobs: Schema.Array(Schema.String),
}) {
    override get message() {
        return this.jobs.length
            ? `${this.ids.join(", ")} is the record id of more than one record, written by ${this.jobs.join(" and ")}: a record id names one record, so where both describe one thing only one job writes it`
            : `${this.ids.join(", ")} is the record id of more than one record in one stage's write`;
    }
}

export class StoreInvariantBroken extends Schema.TaggedError<StoreInvariantBroken>()("StoreInvariantBroken", {
    path: Schema.String,
    cause,
}) {
    override get message() {
        return `a constraint of the record store ${this.path} broke in a write (${innermostCause(this.cause)}), which the checks before it should have prevented`;
    }
}

/**
 * The innermost cause of a failure: what the database itself said, below the layers that wrapped it.
 * @param failure the failure
 * @returns its innermost cause, as text
 */
function innermostCause(failure: unknown): string {
    if (Array.isArray(failure)) {
        const shown = failure.slice(0, 5).map((item) => JSON.stringify(item));
        return `${failure.length} in all; the first ${shown.length}: ${shown.join(", ")}`;
    }
    return Predicate.hasProperty(failure, "cause") && failure.cause !== undefined
        ? innermostCause(failure.cause)
        : String(failure);
}

const scriptErrors = [
    FileNotFound,
    FileUnreadable,
    WriteFailed,
    TornTail,
    PathOutsideRoot,
    RecordInvalid,
    RecordRejected,
    DocumentInvalid,
    AnalysisRequestInvalid,
    UsageInvalid,
    ArtifactMissing,
    GapsRemain,
    GitFailed,
    SiteBuildFailed,
    StoreBusy,
    StoreFailed,
    JobStateFailed,
    JobStateOutdated,
    RecordStoreOutdated,
    RecordIdRepeated,
] as const;

export type ScriptError = InstanceType<(typeof scriptErrors)[number]>;

/**
 * Whether a failure is one the scripts report, rather than a defect in them. The list of error classes above is the
 * one place the reported failures are named, so the type and this check cannot disagree.
 * @param error any failure
 * @returns true for a reported script error
 */
export const isScriptError = (error: unknown): error is ScriptError =>
    scriptErrors.some((errorClass) => error instanceof errorClass);
