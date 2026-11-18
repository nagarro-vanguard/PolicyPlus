import { Predicate, Schema } from "effect";
import { WorkItemIncomplete } from "./work-item-parser";

const cause = Schema.optionalKey(Schema.Unknown);
const files = Schema.Array(Schema.String);

export class RequestInvalid extends Schema.TaggedError<RequestInvalid>()("RequestInvalid", { issue: Schema.String }) {
    override get message() {
        return `Invalid shape-and-deliver request: ${this.issue}.`;
    }
}

export class CodebaseContractBroken extends Schema.TaggedError<CodebaseContractBroken>()("CodebaseContractBroken", {
    issue: Schema.String,
}) {
    override get message() {
        return `The codebase's AGENTS.md files do not give shape-and-deliver what it needs: ${this.issue}.`;
    }
}

export class ArtifactsFolderNotIgnored extends Schema.TaggedError<ArtifactsFolderNotIgnored>()(
    "ArtifactsFolderNotIgnored",
    { folder: Schema.String },
) {
    override get message() {
        return `git does not ignore ${this.folder}. Add ".artifacts/" to the codebase's .gitignore so run files are never committed, and run again.`;
    }
}

export class NotAGitWorkTree extends Schema.TaggedError<NotAGitWorkTree>()("NotAGitWorkTree", {
    folder: Schema.String,
}) {
    override get message() {
        return `${this.folder} is not a git work tree with a commit. shape-and-deliver works on a branch of a git repository.`;
    }
}

export class PlanReviewNotPassed extends Schema.TaggedError<PlanReviewNotPassed>()("PlanReviewNotPassed", {
    path: Schema.String,
}) {
    override get message() {
        return `The plan's review has not passed (${this.path}). Run plan mode until the review passes.`;
    }
}

export class StageOutputMissing extends Schema.TaggedError<StageOutputMissing>()("StageOutputMissing", {
    stage: Schema.String,
    path: Schema.String,
}) {
    override get message() {
        return `${this.stage} needs ${this.path}, which does not exist yet. Run the stage before it first.`;
    }
}

export class StageNotAccepted extends Schema.TaggedError<StageNotAccepted>()("StageNotAccepted", {
    stage: Schema.String,
    needs: Schema.String,
}) {
    override get message() {
        return `${this.stage} needs ${this.needs}, which does not stand accepted yet: run ${this.needs} until its finish prints "accepted", then run ${this.stage}.`;
    }
}

export class FindingsNotReady extends Schema.TaggedError<FindingsNotReady>()("FindingsNotReady", {
    stage: Schema.String,
    until: Schema.String,
}) {
    override get message() {
        return `The ${this.stage} stage has findings to show only once ${this.until}.`;
    }
}

export class WorkingTreeNotClean extends Schema.TaggedError<WorkingTreeNotClean>()("WorkingTreeNotClean", {
    files,
}) {
    override get message() {
        return `The working tree has uncommitted changes (${this.files.join(", ")}). Commit or stash them, so the plan is applied to a known state.`;
    }
}

export class ExistingChecksFail extends Schema.TaggedError<ExistingChecksFail>()("ExistingChecksFail", {
    layer: Schema.String,
    tests: files,
}) {
    override get message() {
        return `Before any code changed, existing checks of ${this.layer} already fail: ${this.tests.join(", ")}. Fix the codebase or its environment first; shape-and-deliver will not change code to hide an existing failure.`;
    }
}

export class RecordInvalid extends Schema.TaggedError<RecordInvalid>()("RecordInvalid", {
    path: Schema.String,
    line: Schema.Number,
    issue: Schema.String,
}) {
    override get message() {
        return `${this.path}:${this.line} is not a valid record: ${this.issue}`;
    }
}

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

export class GitFailed extends Schema.TaggedError<GitFailed>()("GitFailed", {
    root: Schema.String,
    said: Schema.String,
}) {
    override get message() {
        return `git failed in ${this.root}: ${this.said}`;
    }
}

export class GeneratorFailed extends Schema.TaggedError<GeneratorFailed>()("GeneratorFailed", {
    layer: Schema.String,
    command: Schema.String,
    exitCode: Schema.Number,
    outputEnd: Schema.String,
}) {
    override get message() {
        return `The generator \`${this.command}\` of ${this.layer} exited ${this.exitCode}, so nothing was committed. Its output ends:\n${this.outputEnd}\nThe files the apply step wrote stay in the working tree: discard them, fix the generator, and run again.`;
    }
}

export class UnknownJob extends Schema.TaggedError<UnknownJob>()("UnknownJob", { job: Schema.String }) {
    override get message() {
        return `The open batch names the job "${this.job}", which this run does not know, so it was not closed. Remove the batch file only if you are sure no agent is still working for it.`;
    }
}

export class RunLocked extends Schema.TaggedError<RunLocked>()("RunLocked", {
    path: Schema.String,
    holder: Schema.String,
}) {
    override get message() {
        return `Another driver holds this run (${this.holder}); only one may walk it. If that driver is gone, delete ${this.path} and run again.`;
    }
}

export class RunInfoInvalid extends Schema.TaggedError<RunInfoInvalid>()("RunInfoInvalid", {
    path: Schema.String,
    issue: Schema.String,
}) {
    override get message() {
        return `The run info ${this.path} could not be used (${this.issue}), so the batch was not closed. Correct the file, or leave out --run-info, and run next --after again.`;
    }
}

/** Every failure the scripts report to the operator in words, in one list, from which the type and the tags derive. */
const scriptErrors = [
    RequestInvalid,
    WorkItemIncomplete,
    CodebaseContractBroken,
    ArtifactsFolderNotIgnored,
    NotAGitWorkTree,
    PlanReviewNotPassed,
    StageOutputMissing,
    StageNotAccepted,
    FindingsNotReady,
    WorkingTreeNotClean,
    ExistingChecksFail,
    RecordInvalid,
    FileNotFound,
    FileUnreadable,
    WriteFailed,
    GitFailed,
    GeneratorFailed,
    UnknownJob,
    RunLocked,
    RunInfoInvalid,
] as const;

/**
 * Every failure the scripts report to the operator in words: what a step that an interface fixes (a stage's hooks, the
 * render step, a walk's step) can fail with. A function written on its own lets its own failures be inferred instead.
 */
export type ScriptError = InstanceType<(typeof scriptErrors)[number]>;

const scriptErrorTags: ReadonlySet<string> = new Set(scriptErrors.map((each) => each.identifier));

/**
 * Whether a failure is one the scripts report to the operator in words, rather than a defect in the scripts.
 * @param error any failure
 * @returns true for one of the errors above
 */
export const isScriptError = (error: unknown): error is { readonly message: string } =>
    Predicate.hasProperty(error, "_tag") && scriptErrorTags.has(String(error._tag));
